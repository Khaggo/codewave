# Web Invoice Order Management Navigation Surface

## Task ID

`T538`

## Title

Make Invoice & Order Management clearly discoverable in the staff web portal.

## Type

`client-integration`

## Status

`done`

## Priority

`high`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/job-orders.md`
- `../../domains/ecommerce/orders.md`
- `../../domains/ecommerce/invoice-payments.md`
- `../../domains/ecommerce/cart.md`
- `../../frontend-backend-sync.md`
- `../01-main-service/T108-invoice-generation-from-job-orders.md`
- `../02-ecommerce-service/T203-cart-and-invoice-checkout.md`
- `../02-ecommerce-service/T204-order-tracking-and-purchase-history.md`
- `../02-ecommerce-service/T205-invoice-only-payment-tracking.md`
- `T525-cart-and-invoice-checkout-mobile-flow.md`
- `T526-order-history-and-invoice-tracking-mobile-flow.md`

## Depends On

- `T108`
- `T203`
- `T204`
- `T205`
- `T526`

## Goal

Make the progress-report `Invoice & Order Management` module visible in the web portal instead of only appearing as embedded job-order invoice actions, shop cart state, or analytics invoice-aging summaries.

## Deliverables

- a clear staff/admin web entry point for invoice and order management
- distinction between service invoices from job orders and ecommerce orders/invoices
- read-only order/invoice state where mutation endpoints are not available
- clear payment-state copy that does not imply gateway settlement when only manual payment records exist

## Implementation Notes

- service invoice payment remains tied to finalized job orders
- ecommerce order history and invoice truth remain owned by the ecommerce service
- do not create a payment gateway integration in this slice
- if the backend lacks a broad staff invoice/order list endpoint, document the exact route gap and expose the safest available linked surfaces

## Acceptance Checks

- staff/admin users can find an Invoice & Order Management surface from the web portal
- service invoice status is reachable from the job-order workflow
- ecommerce order/invoice truth is either listed from live staff routes or clearly marked as a required API gap
- invoice aging remains visible from analytics without being mistaken for the only invoice module surface
- no customer mobile ecommerce checkout or order-history flow regresses

## Implementation Summary

- Added `/admin/invoices` as the staff web Invoice & Order Management hub.
- Added role-aware sidebar and staff-session navigation visibility for service advisers and super admins.
- Added a web client boundary for known ecommerce order and invoice reads against the ecommerce owner routes.
- Kept service invoice finalization and payment recording in the Job Order Workbench while making service invoice state discoverable from the new hub.
- Surfaced invoice-aging analytics directly from `GET /api/analytics/invoice-aging` with copy that distinguishes reminder analytics from payment settlement truth.

## Required API Gaps Captured

- `GET /api/orders?status=&invoiceStatus=` for a broad staff/admin ecommerce order queue.
- `GET /api/invoices?status=&agingBucket=` for a broad staff/admin invoice queue.
- `GET /api/invoices/export?from=&to=` for future finance export and date-range workflows.

## Acceptance Evidence

- Web surface: `frontend/src/app/admin/invoices/page.js`
- Web workspace: `frontend/src/screens/InvoiceOrderManagementWorkspace.js`
- Web client boundary: `frontend/src/lib/invoiceOrderManagementClient.js`
- Contract pack: `frontend/src/lib/api/generated/invoice-orders/staff-web-invoice-order-management.ts`
- Navigation: `frontend/src/components/layout/Sidebar.js`
- Role visibility: `frontend/src/lib/api/generated/auth/staff-web-session.ts`

## Out of Scope

- online payment gateway settlement
- changing mobile checkout behavior
- merging service invoices and ecommerce orders into one backend table
