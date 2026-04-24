import { cartRoutes } from './requests';
import type {
  CartResponse,
  CheckoutPreviewResponse,
} from './responses';
import {
  ordersRoutes,
  type CheckoutInvoiceAddressRequest,
  type CheckoutInvoiceRequest,
} from '../orders/requests';
import type { OrderResponse } from '../orders/responses';

export type CustomerMobileCartState =
  | 'cart_loading'
  | 'cart_ready'
  | 'cart_empty'
  | 'cart_service_unavailable'
  | 'cart_mutation_failed';

export type CustomerMobileCheckoutState =
  | 'preview_loading'
  | 'preview_ready'
  | 'preview_blocked'
  | 'checkout_validation_error'
  | 'checkout_submitting'
  | 'checkout_complete';

export interface CustomerMobileCartStateRule {
  state: CustomerMobileCartState;
  surface: 'customer-mobile';
  truth: 'cart-route' | 'service-runtime';
  routeKey: 'getCart' | 'addCartItem' | 'updateCartItem' | 'removeCartItem';
  description: string;
}

export interface CustomerMobileCheckoutStateRule {
  state: CustomerMobileCheckoutState;
  surface: 'customer-mobile';
  truth: 'cart-route' | 'order-route' | 'client-guard';
  routeKey: 'checkoutPreview' | 'checkoutInvoice';
  description: string;
}

export interface CustomerMobileBillingAddressPresentation
  extends CheckoutInvoiceAddressRequest {}

export interface CustomerMobileCheckoutSnapshot {
  cart: CartResponse;
  preview: CheckoutPreviewResponse;
  order: OrderResponse | null;
}

export const customerMobileCheckoutRoutes = {
  getCart: cartRoutes.getCart,
  addCartItem: cartRoutes.addCartItem,
  updateCartItem: cartRoutes.updateCartItem,
  removeCartItem: cartRoutes.removeCartItem,
  checkoutPreview: cartRoutes.checkoutPreview,
  checkoutInvoice: ordersRoutes.checkoutInvoice,
} as const;

export const customerMobileCartStateRules: CustomerMobileCartStateRule[] = [
  {
    state: 'cart_loading',
    surface: 'customer-mobile',
    truth: 'cart-route',
    routeKey: 'getCart',
    description: 'The mobile app is loading the current ecommerce cart for the authenticated customer.',
  },
  {
    state: 'cart_ready',
    surface: 'customer-mobile',
    truth: 'cart-route',
    routeKey: 'getCart',
    description: 'One or more cart items are available for invoice preview and checkout.',
  },
  {
    state: 'cart_empty',
    surface: 'customer-mobile',
    truth: 'cart-route',
    routeKey: 'getCart',
    description: 'The customer cart exists but currently contains no items.',
  },
  {
    state: 'cart_service_unavailable',
    surface: 'customer-mobile',
    truth: 'service-runtime',
    routeKey: 'getCart',
    description: 'The ecommerce cart service is unreachable at runtime even though the contract exists.',
  },
  {
    state: 'cart_mutation_failed',
    surface: 'customer-mobile',
    truth: 'cart-route',
    routeKey: 'updateCartItem',
    description: 'A cart item add, update, or delete request failed and the customer must retry or refresh.',
  },
];

export const customerMobileCheckoutStateRules: CustomerMobileCheckoutStateRule[] = [
  {
    state: 'preview_loading',
    surface: 'customer-mobile',
    truth: 'cart-route',
    routeKey: 'checkoutPreview',
    description: 'The app is validating the latest cart snapshot before invoice checkout can proceed.',
  },
  {
    state: 'preview_ready',
    surface: 'customer-mobile',
    truth: 'cart-route',
    routeKey: 'checkoutPreview',
    description: 'The immutable cart snapshot is ready for billing-address review and invoice creation.',
  },
  {
    state: 'preview_blocked',
    surface: 'customer-mobile',
    truth: 'cart-route',
    routeKey: 'checkoutPreview',
    description: 'Checkout preview is blocked because the cart is empty, missing items, or contains unavailable products.',
  },
  {
    state: 'checkout_validation_error',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'checkoutInvoice',
    description: 'Billing-address validation failed in the client before the order create request was sent.',
  },
  {
    state: 'checkout_submitting',
    surface: 'customer-mobile',
    truth: 'order-route',
    routeKey: 'checkoutInvoice',
    description: 'The customer has confirmed the preview and the app is creating the invoice-backed order.',
  },
  {
    state: 'checkout_complete',
    surface: 'customer-mobile',
    truth: 'order-route',
    routeKey: 'checkoutInvoice',
    description: 'An invoice-backed order was created successfully and the cart should no longer imply payment settlement.',
  },
];

export const buildCustomerMobileBillingAddressRequest = (
  address: CustomerMobileBillingAddressPresentation,
  customerUserId: string,
  notes?: string,
): CheckoutInvoiceRequest => ({
  customerUserId,
  billingAddress: {
    recipientName: address.recipientName,
    email: address.email,
    contactPhone: address.contactPhone ?? undefined,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? undefined,
    city: address.city,
    province: address.province,
    postalCode: address.postalCode ?? undefined,
  },
  notes: notes ?? undefined,
});

export const customerMobileCheckoutContractSources = [
  'docs/architecture/domains/ecommerce/cart.md',
  'docs/architecture/domains/ecommerce/orders.md',
  'docs/architecture/domains/ecommerce/invoice-payments.md',
  'docs/architecture/tasks/05-client-integration/T525-cart-and-invoice-checkout-mobile-flow.md',
  'mobile/src/lib/ecommerceCheckoutClient.js',
  'mobile/src/screens/Dashboard.js',
] as const;
