# ERD and Data Ownership

This document lists the key entities and the ownership rules that matter for implementation.

## Main Service Entities

- `users`
- `user_profiles`
- `vehicles`
- `service_categories`
- `services`
- `time_slots`
- `bookings`
- `booking_services`
- `booking_status_history`
- `vehicle_timeline_events`
- `vehicle_inspections`
- `insurance_inquiries`
- `insurance_documents`
- `insurance_records`
- `notification_preferences`
- `notifications`
- `reminder_rules`
- `loyalty_accounts`
- `loyalty_transactions`
- `rewards`
- `reward_redemptions`
- `customer_activity_logs`
- `job_orders`
- `job_progress_logs`
- `back_jobs`
- `back_job_findings`
- `job_order_items`
- `job_order_technicians`
- `technicians`
- `audit_logs`
- `file_uploads`
- `chatbot_flows`
- `chatbot_interactions`

## E-Commerce Service Entities

- `product_categories`
- `products`
- `inventory_items`
- `carts`
- `cart_items`
- `orders`
- `order_items`
- `invoice_payments`
- `addresses`

## Key Relationships

- `users` 1:N `vehicles`
- `bookings` N:M `services` via `booking_services`
- `bookings` 1:N `booking_status_history`
- `vehicles` 1:N `vehicle_timeline_events`
- `vehicle_inspections` N:1 `vehicles`
- `vehicle_inspections` may optionally link to:
  - `bookings`
  - `job_orders`
  - `back_jobs`
- `back_jobs` link to an original `job_order` or completed service record
- `job_orders` may carry:
  - `job_type = normal | back_job`
  - nullable `parent_job_order_id`
- `job_orders` N:M `technicians` via `job_order_technicians`
- `orders` 1:N `order_items`
- `orders` 1:N `invoice_payments`

## Ownership Rules

- Main service owns:
  - customer identity
  - vehicle records
  - booking data
  - inspection data
  - lifecycle data
  - insurance tracking
  - loyalty and rewards
  - back jobs
  - chatbot behavior
  - analytics-oriented activity logs
- E-commerce service owns:
  - products
  - inventory
  - carts
  - orders
  - invoice payment tracking

## Cross-Domain Rules

- Do not create direct cross-service foreign keys.
- Use events or explicit APIs to connect the domains.
- Loyalty updates from e-commerce should be event-driven.
- Analytics summaries from e-commerce should be event-driven or API-fed.

## Accuracy Rule

- Administrative lifecycle events may be system-generated.
- Condition-sensitive lifecycle events should be marked verified only when they reference `vehicle_inspections`.
