# Domain Map

This file is the one-page module index for backend implementation.

## Main Service Modules

| Domain | Main Responsibility | Depends On |
| --- | --- | --- |
| `auth` | credentials, tokens, sessions, access boundaries | `users` |
| `users` | customer identity, profiles, saved addresses, internal flags | `auth` |
| `vehicles` | vehicle records and ownership | `users` |
| `bookings` | services, time slots, booking records, booking statuses | `users`, `vehicles` |
| `vehicle-lifecycle` | unified vehicle timeline | `vehicles`, `bookings`, `inspections`, `insurance`, `back-jobs` |
| `inspections` | physical verification records | `vehicles`, `bookings`, `job-monitoring`, `back-jobs` |
| `insurance` | inquiries, supporting docs, insurance status tracking | `users`, `vehicles` |
| `loyalty` | points ledger, rewards, redemption | `users`, `bookings`, `commerce-events` |
| `back-jobs` | return/rework handling | `vehicles`, `inspections`, `job-monitoring` |
| `job-monitoring` | work execution tracking, technicians, evaluations | `bookings`, `back-jobs` |
| `notifications` | reminders and outbound notices | `bookings`, `insurance`, `back-jobs`, `invoice-payments` |
| `chatbot` | rule-based inquiry routing | `bookings`, `insurance`, `orders` |
| `analytics` | reporting read models and KPIs | almost all operational modules |

## E-Commerce Service Modules

| Domain | Main Responsibility | Depends On |
| --- | --- | --- |
| `catalog` | products and categories | `inventory` |
| `inventory` | stock counts, reservations, adjustments | `catalog`, `orders` |
| `cart` | customer shopping cart lifecycle | `catalog`, `inventory` |
| `orders` | checkout, order records, order item snapshots | `cart`, `inventory`, `invoice-payments` |
| `invoice-payments` | invoice records and payment tracking | `orders` |
| `commerce-events` | outbox, inbox, downstream events | `orders`, `inventory`, `invoice-payments` |

## Shared vs Local

### Shared concerns
- auth guards and identity propagation
- database connectivity
- queue infrastructure
- event publishing and consumption helpers
- generic pagination and filtering helpers

### Local concerns
- booking approval rules
- inspection verification rules
- back-job classification
- loyalty earning and redemption policy
- invoice aging and payment status transitions
- inventory reservation release policy

## Build Order Recommendation

1. `users`
2. `auth`
3. `vehicles`
4. `bookings`
5. `inspections`
6. `vehicle-lifecycle`
7. `job-monitoring`
8. `back-jobs`
9. `notifications`
10. `insurance`
11. `catalog`
12. `inventory`
13. `cart`
14. `orders`
15. `invoice-payments`
16. `commerce-events`
17. `loyalty`
18. `analytics`
19. `chatbot`
