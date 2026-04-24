import {
  ordersRoutes,
  type EcommerceInvoiceStatus,
  type EcommerceOrderStatus,
  type OrderHistoryQuery,
} from './requests';
import type { OrderResponse } from './responses';
import { invoicePaymentRoutes } from '../invoice-payments/requests';
import type { InvoiceResponse } from '../invoice-payments/responses';

export type CustomerMobileOrderHistoryState =
  | 'history_loading'
  | 'history_ready'
  | 'history_empty'
  | 'history_service_unavailable';

export type CustomerMobileOrderTrackingState =
  | 'order_loading'
  | 'order_ready'
  | 'order_unavailable'
  | 'invoice_tracking_ready'
  | 'invoice_tracking_missing';

export interface CustomerMobileOrderHistoryStateRule {
  state: CustomerMobileOrderHistoryState;
  surface: 'customer-mobile';
  truth: 'order-route' | 'service-runtime';
  routeKey: 'listOrdersByUserId';
  description: string;
}

export interface CustomerMobileOrderTrackingStateRule {
  state: CustomerMobileOrderTrackingState;
  surface: 'customer-mobile';
  truth: 'order-route' | 'invoice-route';
  routeKey: 'getOrderById' | 'getOrderInvoice';
  description: string;
}

export interface CustomerMobileOrderHistoryFilter extends OrderHistoryQuery {
  status?: EcommerceOrderStatus;
  invoiceStatus?: EcommerceInvoiceStatus;
}

export interface CustomerMobileTrackedOrderSnapshot {
  order: OrderResponse;
  invoice: InvoiceResponse | null;
}

export const customerMobileOrderHistoryRoutes = {
  listOrdersByUserId: ordersRoutes.listOrdersByUserId,
  getOrderById: ordersRoutes.getOrderById,
  getOrderInvoice: invoicePaymentRoutes.getOrderInvoice,
} as const;

export const customerMobileOrderHistoryStateRules: CustomerMobileOrderHistoryStateRule[] = [
  {
    state: 'history_loading',
    surface: 'customer-mobile',
    truth: 'order-route',
    routeKey: 'listOrdersByUserId',
    description: 'The mobile app is loading the authenticated customer order history.',
  },
  {
    state: 'history_ready',
    surface: 'customer-mobile',
    truth: 'order-route',
    routeKey: 'listOrdersByUserId',
    description: 'At least one invoice-backed ecommerce order is available for customer review.',
  },
  {
    state: 'history_empty',
    surface: 'customer-mobile',
    truth: 'order-route',
    routeKey: 'listOrdersByUserId',
    description: 'The customer has no ecommerce orders yet, even though the live route is available.',
  },
  {
    state: 'history_service_unavailable',
    surface: 'customer-mobile',
    truth: 'service-runtime',
    routeKey: 'listOrdersByUserId',
    description: 'The ecommerce order-history service is unreachable at runtime.',
  },
];

export const customerMobileOrderTrackingStateRules: CustomerMobileOrderTrackingStateRule[] = [
  {
    state: 'order_loading',
    surface: 'customer-mobile',
    truth: 'order-route',
    routeKey: 'getOrderById',
    description: 'The customer selected an order and the app is loading the immutable order snapshot.',
  },
  {
    state: 'order_ready',
    surface: 'customer-mobile',
    truth: 'order-route',
    routeKey: 'getOrderById',
    description: 'The selected order snapshot is available, including status history and address snapshot.',
  },
  {
    state: 'order_unavailable',
    surface: 'customer-mobile',
    truth: 'order-route',
    routeKey: 'getOrderById',
    description: 'The selected order could not be loaded because of auth or runtime failure.',
  },
  {
    state: 'invoice_tracking_ready',
    surface: 'customer-mobile',
    truth: 'invoice-route',
    routeKey: 'getOrderInvoice',
    description: 'Invoice aging and manual payment-entry tracking are available for the selected order.',
  },
  {
    state: 'invoice_tracking_missing',
    surface: 'customer-mobile',
    truth: 'invoice-route',
    routeKey: 'getOrderInvoice',
    description: 'The order exists, but no invoice tracking record was returned yet for the selected order.',
  },
];

export const customerMobileOrderHistoryContractSources = [
  'docs/architecture/domains/ecommerce/orders.md',
  'docs/architecture/domains/ecommerce/invoice-payments.md',
  'docs/architecture/tasks/05-client-integration/T526-order-history-and-invoice-tracking-mobile-flow.md',
  'mobile/src/lib/ecommerceCheckoutClient.js',
  'mobile/src/screens/Dashboard.js',
] as const;
