import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AccessoryPageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 25, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25)
  limit?: number;
}

export class AccessoryProductPageQueryDto extends AccessoryPageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export class AccessoryCustomerAvailabilityDto {
  @ApiProperty({ minimum: 0 })
  availableQuantity!: number;

  @ApiProperty()
  inStock!: boolean;
}

export class AccessoryCustomerProductDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  categoryId!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty()
  isLighting!: boolean;

  @ApiProperty({ type: AccessoryCustomerAvailabilityDto })
  availability!: AccessoryCustomerAvailabilityDto;
}

export class AccessoryCustomerVariantDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: Object })
  attributes!: Record<string, string>;

  @ApiProperty({ minimum: 0 })
  priceCents!: number;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty({ type: AccessoryCustomerAvailabilityDto })
  availability!: AccessoryCustomerAvailabilityDto;
}

export class AccessoryCustomerCartItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  variantId!: string;

  @ApiProperty({ minimum: 1 })
  quantity!: number;
}

export class AccessoryCustomerCartLineDto {
  @ApiProperty({ type: AccessoryCustomerCartItemDto })
  item!: AccessoryCustomerCartItemDto;

  @ApiProperty({ type: AccessoryCustomerVariantDto })
  variant!: AccessoryCustomerVariantDto;

  @ApiProperty({ type: AccessoryCustomerProductDto })
  product!: AccessoryCustomerProductDto;

  @ApiProperty({ type: AccessoryCustomerAvailabilityDto })
  availability!: AccessoryCustomerAvailabilityDto;

  @ApiProperty({ minimum: 0 })
  unitPriceCents!: number;

  @ApiProperty({ minimum: 0 })
  lineSubtotalCents!: number;

  @ApiProperty({ minimum: 0 })
  lineTotalCents!: number;
}

export class AccessoryCustomerCartResponseDto {
  @ApiPropertyOptional({ nullable: true })
  selectedVehicleId!: string | null;

  @ApiProperty({ minimum: 0 })
  version!: number;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty({ minimum: 0 })
  subtotalCents!: number;

  @ApiProperty({ minimum: 0 })
  totalCents!: number;

  @ApiProperty({ type: [AccessoryCustomerCartLineDto] })
  items!: AccessoryCustomerCartLineDto[];
}

export class AccessoryFitmentQueryDto {
  @ApiProperty()
  @IsUUID()
  vehicleId!: string;
}

export class AccessoryCartItemDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty({ minimum: 1, maximum: 99 })
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export class ReplaceAccessoryCartDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  selectedVehicleId?: string | null;

  @ApiProperty({ type: [AccessoryCartItemDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AccessoryCartItemDto)
  items!: AccessoryCartItemDto[];
}

export class PatchAccessoryCartDto extends AccessoryCartItemDto {}

export class DeleteAccessoryCartQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;
}

export class AccessoryCheckoutAcknowledgementDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty()
  @IsBoolean()
  acknowledgedUnverified!: boolean;
}

export class AccessoryCheckoutContactDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^\+?[0-9 ()-]{7,24}$/)
  phone!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export enum AccessoryPaymentMethodDtoValue {
  PayMongo = 'paymongo',
  PayAtShop = 'pay_at_shop',
}

const accessoryPaymentMethodAliases: Record<string, AccessoryPaymentMethodDtoValue> = {
  paymongo: AccessoryPaymentMethodDtoValue.PayMongo,
  pay_mongo: AccessoryPaymentMethodDtoValue.PayMongo,
  paymongo_checkout: AccessoryPaymentMethodDtoValue.PayMongo,
  online: AccessoryPaymentMethodDtoValue.PayMongo,
  online_payment: AccessoryPaymentMethodDtoValue.PayMongo,
  pay_at_shop: AccessoryPaymentMethodDtoValue.PayAtShop,
  pay_at_store: AccessoryPaymentMethodDtoValue.PayAtShop,
  pay_at_counter: AccessoryPaymentMethodDtoValue.PayAtShop,
  manual_counter: AccessoryPaymentMethodDtoValue.PayAtShop,
  cash: AccessoryPaymentMethodDtoValue.PayAtShop,
};

export const normalizeAccessoryPaymentMethod = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const token = value
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return accessoryPaymentMethodAliases[token] ?? value;
};

export class AccessoryCheckoutDto {
  @ApiProperty({ enum: AccessoryPaymentMethodDtoValue })
  @Transform(({ value }) => normalizeAccessoryPaymentMethod(value))
  @IsEnum(AccessoryPaymentMethodDtoValue)
  paymentMethod!: AccessoryPaymentMethodDtoValue;

  @ApiProperty({ type: AccessoryCheckoutContactDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => AccessoryCheckoutContactDto)
  contact!: AccessoryCheckoutContactDto;

  @ApiPropertyOptional({ type: [AccessoryCheckoutAcknowledgementDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AccessoryCheckoutAcknowledgementDto)
  fitmentAcknowledgements?: AccessoryCheckoutAcknowledgementDto[];
}

export class CancelAccessoryOrderDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class CreateAccessoryCategoryDto {
  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(120)
  slug!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class CreateAccessoryProductDto {
  @ApiProperty()
  @IsUUID()
  categoryId!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(180)
  slug!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isLighting?: boolean;
}

export class CreateAccessoryVariantDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[A-Z0-9][A-Z0-9._-]{2,99}$/)
  sku!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  priceCents!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;
}

export class UpdateAccessoryVariantDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  priceCents!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export enum AccessoryFitmentStatusDtoValue {
  Universal = 'universal',
  Compatible = 'compatible',
  Incompatible = 'incompatible',
  Unverified = 'unverified',
}

export class CreateAccessoryFitmentDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty({ enum: AccessoryFitmentStatusDtoValue })
  @IsEnum(AccessoryFitmentStatusDtoValue)
  status!: AccessoryFitmentStatusDtoValue;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  make?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2200)
  yearFrom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2200)
  yearTo?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ReviewAccessoryLightingDto {
  @ApiProperty()
  @IsBoolean()
  compatibilityApproved!: boolean;

  @ApiProperty()
  @IsBoolean()
  complianceApproved!: boolean;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

export class PublishAccessoryProductDto {
  @ApiProperty({ enum: ['draft', 'active', 'archived'] })
  @IsEnum({ Draft: 'draft', Active: 'active', Archived: 'archived' })
  status!: 'draft' | 'active' | 'archived';

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

export class AdjustAccessoryStockDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty({ description: 'Signed on-hand adjustment.' })
  @IsInt()
  quantityDelta!: number;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

export class ReassignAccessoryOrderDto {
  @ApiProperty()
  @IsUUID()
  assigneeUserId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

export class TransitionAccessoryOrderDto {
  @ApiProperty({ enum: ['preparing', 'ready_for_pickup', 'collected'] })
  @IsEnum({ Preparing: 'preparing', Ready: 'ready_for_pickup', Collected: 'collected' })
  status!: 'preparing' | 'ready_for_pickup' | 'collected';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  orderReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  pickupCode?: string;
}

export class CreateAccessoryRefundDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

export class AccessoryMediaMetadataDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  altText!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder!: number;
}
