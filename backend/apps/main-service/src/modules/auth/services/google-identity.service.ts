import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

type VerifiedGoogleIdentity = {
  email: string;
  subject: string;
  firstName: string;
  lastName: string;
};

type GoogleTokenPayload = {
  email?: string;
  sub?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
};

@Injectable()
export class GoogleIdentityService {
  private readonly client: OAuth2Client;

  constructor(private readonly configService: ConfigService) {
    this.client = new OAuth2Client();
  }

  async verifyIdToken(googleIdToken: string): Promise<VerifiedGoogleIdentity> {
    const clientId = this.configService.get<string>('google.clientId');
    if (!clientId) {
      throw new InternalServerErrorException('Google identity verification is not configured');
    }

    let payload: GoogleTokenPayload | undefined;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: googleIdToken,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    if (!payload?.email || !payload.sub) {
      throw new BadRequestException('Google identity payload is incomplete');
    }

    if (!payload.email_verified) {
      throw new UnauthorizedException('Google email is not verified');
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    const { firstName, lastName } = this.resolveNames(payload.given_name, payload.family_name, payload.name);

    return {
      email: normalizedEmail,
      subject: payload.sub,
      firstName,
      lastName,
    };
  }

  private resolveNames(givenName?: string, familyName?: string, fullName?: string) {
    const normalizedGivenName = givenName?.trim();
    const normalizedFamilyName = familyName?.trim();

    if (normalizedGivenName && normalizedFamilyName) {
      return {
        firstName: normalizedGivenName,
        lastName: normalizedFamilyName,
      };
    }

    const normalizedFullName = fullName?.trim();
    if (!normalizedFullName) {
      throw new BadRequestException('Google profile is missing required name information');
    }

    const [firstName, ...rest] = normalizedFullName.split(/\s+/);
    const lastName = rest.join(' ').trim();
    if (!firstName || !lastName) {
      throw new BadRequestException('Google profile is missing required name information');
    }

    return {
      firstName,
      lastName,
    };
  }
}
