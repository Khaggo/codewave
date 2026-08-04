import { createHash, createHmac, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AccessoryActor, assertAccessoryAdmin } from '../common/accessories-common';
import { AccessoryMediaMetadataDto } from '../dto/accessories.dto';
import { AccessoriesRepository } from '../repositories/accessories.repository';

const MAX_ACCESSORY_MEDIA_BYTES = 8 * 1024 * 1024;

export type AccessoryUploadFile = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname?: string;
};

const detectedMimeType = (buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
};

const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const hmac = (key: Buffer | string, value: string) => createHmac('sha256', key).update(value).digest();

@Injectable()
export class AccessoriesMediaService {
  constructor(
    private readonly configService: ConfigService,
    private readonly repository: AccessoriesRepository,
  ) {}

  async upload(
    file: AccessoryUploadFile | undefined,
    metadata: AccessoryMediaMetadataDto,
    actor: AccessoryActor,
  ) {
    assertAccessoryAdmin(actor);
    if (
      !file?.buffer?.length
        || file.buffer.length > MAX_ACCESSORY_MEDIA_BYTES
        || file.size !== file.buffer.length
    ) {
      throw new BadRequestException('Accessory media must be a non-empty image no larger than 8 MB.');
    }
    const originalName = file.originalname?.trim();
    if (
      originalName &&
      (originalName.length > 200 || /[\\/\u0000-\u001f\u007f]/.test(originalName))
    ) {
      throw new BadRequestException('Accessory media filename is unsafe.');
    }
    const mimeType = detectedMimeType(file.buffer);
    if (!mimeType || (file.mimetype && file.mimetype !== mimeType)) {
      throw new BadRequestException('Accessory media content does not match an allowed image type.');
    }
    const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1];
    const id = randomUUID();
    const storageKey = `products/${metadata.productId}/${id}.${extension}`;
    const publicUrl = await this.store(id, storageKey, file.buffer, mimeType);
    return this.repository.createMedia({
      actor,
      values: {
        id,
        productId: metadata.productId,
        storageKey,
        publicUrl,
        mimeType,
        byteSize: file.buffer.length,
        altText: metadata.altText,
        displayOrder: metadata.displayOrder,
      },
    });
  }

  async read(id: string, actor: AccessoryActor) {
    const media = await this.repository.findMedia(id, actor.role !== 'customer');
    if (!media) throw new NotFoundException('Accessory media not found.');
    if (this.configService.get<string>('accessories.media.driver', 'local') === 's3') {
      return { media, buffer: await this.getS3(media.storageKey, media.mimeType) };
    }
    const root = path.resolve(
      process.cwd(),
      this.configService.get<string>(
        'accessories.media.localDirectory',
        '.runtime/accessories-media',
      ),
    );
    const absolute = path.resolve(root, media.storageKey);
    if (!absolute.startsWith(`${root}${path.sep}`)) throw new NotFoundException('Invalid media key.');
    return { media, buffer: await readFile(absolute) };
  }

  private async getS3(storageKey: string, expectedMimeType: string): Promise<Buffer> {
    const endpoint = this.configService.get<string>('accessories.media.endpoint');
    const region = this.configService.get<string>('accessories.media.region');
    const bucket = this.configService.get<string>('accessories.media.bucket');
    const accessKeyId = this.configService.get<string>('accessories.media.accessKeyId');
    const secretAccessKey = this.configService.get<string>('accessories.media.secretAccessKey');
    if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
      throw new NotFoundException('Durable Accessories media storage is not fully configured.');
    }
    const encodedKey = storageKey.split('/').map(encodeURIComponent).join('/');
    const url = new URL(`${endpoint.replace(/\/$/, '')}/${encodeURIComponent(bucket)}/${encodedKey}`);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256('');
    const canonicalHeaders = [
      `host:${url.host}`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amzDate}`,
      '',
    ].join('\n');
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = [
      'GET',
      url.pathname,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');
    const scope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
    const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
    const regionKey = hmac(dateKey, region);
    const serviceKey = hmac(regionKey, 's3');
    const signingKey = hmac(serviceKey, 'aws4_request');
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    const response = await fetch(url, {
      headers: {
        Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
      },
    });
    if (!response.ok) throw new NotFoundException('Accessory media could not be loaded.');
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_ACCESSORY_MEDIA_BYTES) {
      throw new NotFoundException('Accessory media is invalid.');
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_ACCESSORY_MEDIA_BYTES || detectedMimeType(buffer) !== expectedMimeType) {
      throw new NotFoundException('Accessory media is invalid.');
    }
    return buffer;
  }

  private async store(
    mediaId: string,
    storageKey: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const driver = this.configService.get<'local' | 's3'>('accessories.media.driver', 'local');
    if (driver === 'local') {
      const root = path.resolve(
        process.cwd(),
        this.configService.get<string>(
          'accessories.media.localDirectory',
          '.runtime/accessories-media',
        ),
      );
      const absolute = path.resolve(root, storageKey);
      if (!absolute.startsWith(`${root}${path.sep}`)) throw new BadRequestException('Invalid media key.');
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, buffer, { flag: 'wx' });
      return `/api/accessories/media/${mediaId}`;
    }
    await this.putS3(storageKey, buffer, mimeType);
    return `/api/accessories/media/${mediaId}`;
  }

  private async putS3(storageKey: string, buffer: Buffer, mimeType: string): Promise<void> {
    const endpoint = this.configService.get<string>('accessories.media.endpoint');
    const region = this.configService.get<string>('accessories.media.region');
    const bucket = this.configService.get<string>('accessories.media.bucket');
    const accessKeyId = this.configService.get<string>('accessories.media.accessKeyId');
    const secretAccessKey = this.configService.get<string>('accessories.media.secretAccessKey');
    if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
      throw new BadRequestException('Durable Accessories media storage is not fully configured.');
    }
    const encodedKey = storageKey.split('/').map(encodeURIComponent).join('/');
    const url = new URL(`${endpoint.replace(/\/$/, '')}/${encodeURIComponent(bucket)}/${encodedKey}`);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256(buffer);
    const canonicalHeaders = [
      `content-type:${mimeType}`,
      `host:${url.host}`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amzDate}`,
      '',
    ].join('\n');
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = [
      'PUT',
      url.pathname,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');
    const scope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
    const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
    const regionKey = hmac(dateKey, region);
    const serviceKey = hmac(regionKey, 's3');
    const signingKey = hmac(serviceKey, 'aws4_request');
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: authorization,
        'Content-Type': mimeType,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
      },
      body: new Blob([new Uint8Array(buffer)], { type: mimeType }),
    });
    if (!response.ok) throw new BadRequestException(`Durable media upload failed (${response.status}).`);
  }
}
