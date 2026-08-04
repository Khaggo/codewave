import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { Roles } from '@main-modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@main-modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@main-modules/auth/guards/roles.guard';

import { AccessoryActor } from '../common/accessories-common';
import {
  AccessoryCheckoutDto,
  AccessoryFitmentQueryDto,
  AccessoryMediaMetadataDto,
  AccessoryPageQueryDto,
  AccessoryProductPageQueryDto,
  AdjustAccessoryStockDto,
  CancelAccessoryOrderDto,
  CreateAccessoryCategoryDto,
  CreateAccessoryFitmentDto,
  CreateAccessoryProductDto,
  CreateAccessoryRefundDto,
  CreateAccessoryVariantDto,
  DeleteAccessoryCartQueryDto,
  PatchAccessoryCartDto,
  PublishAccessoryProductDto,
  ReassignAccessoryOrderDto,
  ReplaceAccessoryCartDto,
  ReviewAccessoryLightingDto,
  TransitionAccessoryOrderDto,
  UpdateAccessoryVariantDto,
} from '../dto/accessories.dto';
import { AccessoriesPaymentService } from '../services/accessories-payment.service';
import {
  AccessoriesMediaService,
  AccessoryUploadFile,
} from '../services/accessories-media.service';
import { AccessoriesService } from '../services/accessories.service';

const actorFrom = (request: Request) => request.user as AccessoryActor;

const AccessoryIdempotencyHeader = () =>
  ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Stable retry key. Reusing it with a different payload returns 409.',
  });

const AccessoryVersionHeader = () =>
  ApiHeader({
    name: 'If-Match',
    required: true,
    description: 'Current integer resource version used for optimistic concurrency control.',
  });

@ApiTags('accessories')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer')
@Controller('accessories')
export class CustomerAccessoriesController {
  constructor(
    private readonly service: AccessoriesService,
    private readonly payments: AccessoriesPaymentService,
    private readonly media: AccessoriesMediaService,
  ) {}

  @Get('capabilities')
  @ApiOperation({ summary: 'Read the current Accessories rollout capabilities.' })
  capabilities() {
    return this.service.capabilities();
  }

  @Get('categories')
  listCategories(@Req() request: Request) {
    return this.service.listCategories(actorFrom(request));
  }

  @Get('products')
  listProducts(@Query() query: AccessoryProductPageQueryDto, @Req() request: Request) {
    return this.service.listProducts(query, actorFrom(request));
  }

  @Get('products/:slug')
  getProduct(@Param('slug') slug: string, @Req() request: Request) {
    return this.service.getProduct(slug, actorFrom(request));
  }

  @Get('variants/:id/fitment')
  getFitment(
    @Param('id') id: string,
    @Query() query: AccessoryFitmentQueryDto,
    @Req() request: Request,
  ) {
    return this.service.getFitment(id, query, actorFrom(request));
  }

  @Get('media/:id')
  @Roles('customer', 'service_adviser', 'super_admin')
  async readMedia(@Param('id') id: string, @Req() request: Request) {
    const result = await this.media.read(id, actorFrom(request));
    return new StreamableFile(result.buffer, { type: result.media.mimeType });
  }

  @Get('cart')
  getCart(@Req() request: Request) {
    return this.service.getCart(actorFrom(request));
  }

  @Put('cart')
  @AccessoryVersionHeader()
  replaceCart(
    @Body() payload: ReplaceAccessoryCartDto,
    @Headers('if-match') version: string | undefined,
    @Req() request: Request,
  ) {
    return this.service.replaceCart(payload, version, actorFrom(request));
  }

  @Patch('cart')
  @AccessoryVersionHeader()
  patchCart(
    @Body() payload: PatchAccessoryCartDto,
    @Headers('if-match') version: string | undefined,
    @Req() request: Request,
  ) {
    return this.service.patchCart(payload, version, actorFrom(request));
  }

  @Delete('cart')
  @AccessoryVersionHeader()
  deleteCart(
    @Query() query: DeleteAccessoryCartQueryDto,
    @Headers('if-match') version: string | undefined,
    @Req() request: Request,
  ) {
    return this.service.deleteCart(query.variantId, version, actorFrom(request));
  }

  @Post('checkouts/preview')
  previewCheckout(@Body() payload: AccessoryCheckoutDto, @Req() request: Request) {
    return this.service.previewCheckout(payload, actorFrom(request));
  }

  @Post('checkouts')
  @AccessoryIdempotencyHeader()
  checkout(
    @Body() payload: AccessoryCheckoutDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ) {
    return this.service.checkout(payload, idempotencyKey, actorFrom(request));
  }

  @Get('orders/mine')
  listOrders(@Query() query: AccessoryPageQueryDto, @Req() request: Request) {
    return this.service.listMyOrders(query, actorFrom(request));
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string, @Req() request: Request) {
    return this.service.getOrder(id, actorFrom(request));
  }

  @Post('orders/:id/cancel')
  @AccessoryIdempotencyHeader()
  cancelOrder(
    @Param('id') id: string,
    @Body() payload: CancelAccessoryOrderDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ) {
    return this.service.cancelOrder(id, payload, idempotencyKey, actorFrom(request));
  }

  @Post('orders/:id/payment/retry')
  @AccessoryIdempotencyHeader()
  retryPayment(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ) {
    return this.payments.createCheckoutSession(id, actorFrom(request), idempotencyKey);
  }

  @Post('orders/:id/pickup-code/regenerate')
  regeneratePickupCode(@Param('id') id: string, @Req() request: Request) {
    return this.service.regeneratePickupCode(id, actorFrom(request));
  }
}

@ApiTags('admin-accessories')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/accessories')
export class StaffAccessoriesController {
  constructor(
    private readonly service: AccessoriesService,
    private readonly payments: AccessoriesPaymentService,
    private readonly media: AccessoriesMediaService,
  ) {}

  @Get('catalog/categories')
  @Roles('super_admin')
  listCategories(@Req() request: Request) {
    return this.service.listCategories(actorFrom(request), true);
  }

  @Post('catalog/categories')
  @Roles('super_admin')
  createCategory(@Body() payload: CreateAccessoryCategoryDto, @Req() request: Request) {
    return this.service.createCategory(payload, actorFrom(request));
  }

  @Get('catalog/products')
  @Roles('super_admin')
  listProducts(@Query() query: AccessoryProductPageQueryDto, @Req() request: Request) {
    return this.service.listProducts(query, actorFrom(request), true);
  }

  @Post('catalog/products')
  @Roles('super_admin')
  createProduct(@Body() payload: CreateAccessoryProductDto, @Req() request: Request) {
    return this.service.createProduct(payload, actorFrom(request));
  }

  @Get('catalog/products/:slug')
  @Roles('super_admin')
  getProduct(@Param('slug') slug: string, @Req() request: Request) {
    return this.service.getProduct(slug, actorFrom(request), true);
  }

  @Post('catalog/variants')
  @Roles('super_admin')
  createVariant(@Body() payload: CreateAccessoryVariantDto, @Req() request: Request) {
    return this.service.createVariant(payload, actorFrom(request));
  }

  @Patch('catalog/variants/:id')
  @Roles('super_admin')
  @AccessoryVersionHeader()
  updateVariant(
    @Param('id') id: string,
    @Headers('if-match') version: string | undefined,
    @Body() payload: UpdateAccessoryVariantDto,
    @Req() request: Request,
  ) {
    return this.service.updateVariant(id, version, payload, actorFrom(request));
  }

  @Post('fitments')
  @Roles('super_admin')
  createFitment(@Body() payload: CreateAccessoryFitmentDto, @Req() request: Request) {
    return this.service.createFitment(payload, actorFrom(request));
  }

  @Post('media')
  @Roles('super_admin')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024, files: 1 } }))
  uploadMedia(
    @UploadedFile() file: AccessoryUploadFile | undefined,
    @Body() metadata: AccessoryMediaMetadataDto,
    @Req() request: Request,
  ) {
    return this.media.upload(file, metadata, actorFrom(request));
  }

  @Post('catalog/products/:id/lighting-review')
  @Roles('super_admin')
  reviewLighting(
    @Param('id') id: string,
    @Body() payload: ReviewAccessoryLightingDto,
    @Req() request: Request,
  ) {
    return this.service.reviewLighting(id, payload, actorFrom(request));
  }

  @Patch('catalog/products/:id/status')
  @Roles('super_admin')
  @AccessoryVersionHeader()
  publishProduct(
    @Param('id') id: string,
    @Headers('if-match') version: string | undefined,
    @Body() payload: PublishAccessoryProductDto,
    @Req() request: Request,
  ) {
    return this.service.publishProduct(id, version, payload, actorFrom(request));
  }

  @Post('stock/adjustments')
  @Roles('super_admin')
  @AccessoryIdempotencyHeader()
  adjustStock(
    @Body() payload: AdjustAccessoryStockDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ) {
    return this.service.adjustStock(payload, idempotencyKey, actorFrom(request));
  }

  @Get('stock')
  @Roles('super_admin')
  listStock(@Query() query: AccessoryPageQueryDto, @Req() request: Request) {
    return this.service.listStock(query, actorFrom(request));
  }

  @Get('orders')
  @Roles('service_adviser', 'super_admin')
  listOrders(@Query() query: AccessoryPageQueryDto, @Req() request: Request) {
    return this.service.listStaffOrders(query, actorFrom(request));
  }

  @Post('orders/:id/take')
  @Roles('service_adviser', 'super_admin')
  @AccessoryVersionHeader()
  takeOrder(
    @Param('id') id: string,
    @Headers('if-match') version: string | undefined,
    @Req() request: Request,
  ) {
    return this.service.takeOrder(id, version, actorFrom(request));
  }

  @Post('orders/:id/reassign')
  @Roles('super_admin')
  @AccessoryVersionHeader()
  reassignOrder(
    @Param('id') id: string,
    @Headers('if-match') version: string | undefined,
    @Body() payload: ReassignAccessoryOrderDto,
    @Req() request: Request,
  ) {
    return this.service.reassignOrder(id, version, payload, actorFrom(request));
  }

  @Post('orders/:id/cancel')
  @Roles('super_admin')
  @AccessoryIdempotencyHeader()
  cancelOrder(
    @Param('id') id: string,
    @Body() payload: CancelAccessoryOrderDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ) {
    return this.service.adminCancelOrder(
      id,
      payload,
      idempotencyKey,
      actorFrom(request),
    );
  }

  @Get('orders/:id')
  @Roles('service_adviser', 'super_admin')
  getOrder(@Param('id') id: string, @Req() request: Request) {
    return this.service.getOrder(id, actorFrom(request));
  }

  @Patch('orders/:id/status')
  @Roles('service_adviser', 'super_admin')
  @AccessoryVersionHeader()
  transitionOrder(
    @Param('id') id: string,
    @Headers('if-match') version: string | undefined,
    @Body() payload: TransitionAccessoryOrderDto,
    @Req() request: Request,
  ) {
    return this.service.transitionOrder(id, version, payload, actorFrom(request));
  }

  @Get('refunds')
  @Roles('super_admin')
  listRefunds(@Query() query: AccessoryPageQueryDto, @Req() request: Request) {
    return this.payments.listRefunds(query, actorFrom(request));
  }

  @Post('refunds/:id/approve')
  @Roles('super_admin')
  @AccessoryIdempotencyHeader()
  approveRefund(
    @Param('id') id: string,
    @Body() _payload: CreateAccessoryRefundDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ) {
    return this.payments.refund(id, actorFrom(request), idempotencyKey);
  }
}

@ApiTags('accessories-payments')
@Controller('accessories/payments/paymongo')
export class AccessoriesWebhookController {
  constructor(private readonly payments: AccessoriesPaymentService) {}

  @Post('webhook')
  @ApiHeader({
    name: 'Paymongo-Signature',
    required: true,
    description: 'PayMongo webhook signature over the unmodified raw request body.',
  })
  webhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('paymongo-signature') signature: string | undefined,
  ) {
    return this.payments.handlePayMongoWebhook(request.rawBody, signature);
  }
}
