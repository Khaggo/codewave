# AUTOCARE PM Flow Summary Pack

Date: 2026-04-18  
Purpose: PM-friendly summary flow set using Mermaid-safe diagrams and shorter labels

## Notes

- This pack is for reporting, review meetings, and presentation use.
- It intentionally uses **simple Mermaid flowcharts only** for better renderer compatibility.
- For engineering source-of-truth details, use:
  - [team-flow-engineering-source-of-truth.md](./team-flow-engineering-source-of-truth.md)
  - [team-flow-redraw-structure.md](./team-flow-redraw-structure.md)

## 1. System Overview

```mermaid
flowchart LR
  MOBILE[Mobile Customer App]
  WEB[Web Staff Portal]
  MAIN[Main Service]
  ECOM[Ecommerce Service]
  MQ[Events and Jobs]
  NOTIFS[Notifications]

  MOBILE --> MAIN
  MOBILE --> ECOM
  WEB --> MAIN
  WEB --> ECOM

  MAIN --> MQ
  ECOM --> MQ
  MQ --> NOTIFS
```

## 2. Customer Journey Summary

```mermaid
flowchart TD
  A[Mobile Entry] --> B[Register]
  B --> C[Add Vehicle]
  C --> D[Verify OTP]
  D --> E[Account Active]
  E --> F[Customer Home]

  F --> G[Book Service]
  G --> H[Slot Check]
  H --> I[Booking Confirmed]

  F --> J[Insurance Inquiry]
  J --> K[Track Claim]

  F --> L[Loyalty]
  L --> M[Redeem Reward]

  F --> N[Shop]
  N --> O[Checkout]
```

## 3. Staff/Admin Summary

```mermaid
flowchart TD
  A[Web Entry] --> B[Staff Login]
  B --> C[Role Check]
  C --> D[Dashboard]

  D --> E[Booking Queue]
  E --> F[Create Job Order]
  F --> G[Assign Technician]
  G --> H[Work and Evidence]
  H --> I[QA Review]
  I --> J[Release or Rework]

  D --> K[Insurance Queue]
  D --> L[Loyalty Config]
  D --> M[Staff Provisioning]
```

## 4. Commerce Summary

```mermaid
flowchart TD
  A[Browse Catalog] --> B[Add to Cart]
  B --> C[Checkout]
  C --> D[Create Order]
  D --> E[Reserve Stock]
  E --> F[Invoice and Payment]
  F --> G[Fulfillment]
  G --> H[Complete Order]
```

## 5. Service Loyalty Summary

```mermaid
flowchart TD
  A[Booking Confirmed] --> B[Create Job Order]
  B --> C[Repair Completed]
  C --> D[Service Invoice Finalized]
  D --> E[Service Payment Recorded]
  E --> F[Evaluate Earning Rules]
  F --> G[Loyalty Points Earned]
  G --> H[Customer Reward Eligible]
```

## 6. Async and Support Summary

```mermaid
flowchart TD
  A[Booking Confirmed] --> B[Timeline Update]
  A --> C[Booking Notice]

  D[Job Finalized] --> E[QA Review]
  E --> F[Customer Summary]
  E --> B

  G[Claim Status Changed] --> H[Claim Notice]

  I[Order Created] --> J[Stock Update]
  I --> K[Fulfillment Alert]

  L[OTP Requested] --> M[OTP Email Job]
  N[AI Review Requested] --> O[AI Job]
```

## PM Talking Points

- `mobile` is for customers.
- `web` is for staff and admins.
- `main-service` owns operations like auth, bookings, job orders, QA, insurance, loyalty, and notifications.
- `ecommerce-service` owns shopping, orders, stock, and invoice tracking.
- loyalty points are earned from paid service work, not from ecommerce checkout.
- admins configure both reward definitions and earning rules for the loyalty program.
- Notifications, timeline refresh, and AI processing are support flows, not the main business-state owners.
- QA still requires human approval even when AI assistance exists.
