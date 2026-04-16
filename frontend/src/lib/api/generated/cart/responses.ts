export type CartItemAvailabilityStatus = 'available' | 'inactive' | 'missing';

export interface CartItemResponse {
  id: string;
  productId: string;
  productName: string | null;
  productSlug: string | null;
  productSku: string | null;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  availabilityStatus: CartItemAvailabilityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CartResponse {
  id: string;
  customerUserId: string;
  items: CartItemResponse[];
  subtotalCents: number;
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutPreviewResponse {
  cartId: string;
  customerUserId: string;
  checkoutMode: 'invoice';
  items: CartItemResponse[];
  subtotalCents: number;
  totalQuantity: number;
}
