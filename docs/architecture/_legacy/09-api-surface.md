# API Surface

This document summarizes the main technical entry points implied by the system plan.

## Main Service APIs

### Accounts

- `POST /auth/register`
- `POST /auth/login`
- `GET /me`
- `PATCH /profile`
- `GET /vehicles`
- `POST /vehicles`

### Bookings

- `GET /services`
- `GET /time-slots`
- `POST /bookings`
- `PATCH /bookings/:id/status`

### Vehicle Lifecycle

- `GET /vehicles/:id/timeline`
- internal `refreshVehicleTimeline` job

### Vehicle Inspections

- `POST /vehicles/:id/inspections`
- `GET /vehicles/:id/inspections`

### Insurance

- `POST /insurance/inquiries`
- `POST /insurance/inquiries/:id/documents`
- `GET /insurance/inquiries/:id`

### Job Monitoring

- `GET /job-orders`
- `PATCH /job-orders/:id/status`
- `POST /job-orders/:id/progress`

### Back Jobs

- `POST /back-jobs`
- `GET /back-jobs/:id`
- `PATCH /back-jobs/:id/status`

### Chatbot

- `POST /chatbot/message`
- `GET /chatbot/intents`

### Loyalty

- `GET /loyalty/account`
- `GET /loyalty/rewards`
- `POST /loyalty/redeem`

## E-Commerce APIs

- `GET /products`
- `POST /cart/items`
- `POST /checkout/invoice`
- `GET /orders`
- invoice-payment tracking endpoints as needed

## Contract Rules

- Main service owns lifecycle, inspection, and back-job logic.
- E-commerce owns invoice order and payment-status tracking.
- Cross-domain updates should use events or explicit APIs.
- Payment tracking should not be treated as automated settlement proof.
