# AUTOCARE Paper and System Alignment Report

Date: 2026-04-18  
Status: Alignment review based on the current paper, canonical architecture docs, and live repo code

## Purpose

This report answers three things in one place:

1. what should change in the paper
2. what should change in the system
3. what the current web build, mobile build, and overall tech stack actually are today

The paper is treated as authoritative for loyalty direction, React Native mobile, and FAQ-guided chatbot behavior. The current system is treated as authoritative for auth and integration policy, approved external dependencies, and email-only notifications.

For a paper-only review, see [autocare-paper-changes-report.md](./autocare-paper-changes-report.md).

## Executive Summary

- The current product direction is mostly compatible with the paper, but several wording and system gaps remain.
- The largest real system gap is loyalty. The paper wants points from completed service work and ecommerce purchases, while the current canonical docs and loyalty logic are still service-payment-first.
- Web and mobile direction are broadly aligned: web is `Next.js`, mobile is `Expo React Native`. The main gap is that some architecture docs still understate the existence of the real `mobile/` app.
- Chatbot direction is also broadly aligned as long as it stays a FAQ and common-inquiry assistant with escalation, separate from reviewed generative AI summaries.
- Auth, approved third-party integrations, and notifications should follow the current system, not the older paper wording.

## Paper Changes

| Topic | Label | Current position | Recommended paper change |
| --- | --- | --- | --- |
| Web framework direction | `already aligned` | The paper already points to a web app built with `Next.js` and React. | Keep this direction. No framework change is needed. |
| Mobile framework direction | `already aligned` | The paper already points to a customer mobile app built with React Native. | Keep this direction. No framework change is needed. |
| Repo-shape wording | `paper must change` | The paper describes the product surfaces, but it does not reflect the current repo shape clearly enough. | Update the wording so it reflects the current implementation snapshot: `frontend/` is the web app and `mobile/` is a real Expo React Native app, not just a future target. |
| Loyalty earning | `paper must change` | The paper says loyalty is earned from completed service work and ecommerce purchases. | Keep that direction, but tighten the wording so ecommerce loyalty means a paid or settled ecommerce purchase or invoice, not cart creation, checkout start, or unpaid invoice state. |
| Notifications | `paper must change` | The paper mentions push notifications as if they are part of the active scope. | Change the paper to email-only current scope. Push can be mentioned only as future backlog if needed, not current implementation scope. |
| FAQ chatbot direction | `already aligned` | The paper describes a 24/7 FAQ/common-question assistant. | Keep this direction. It matches the current intended chatbot role. |
| Chatbot and AI boundary | `paper must change` | The paper places chatbot and generative AI features close together. | Make the boundary explicit: the chatbot is a FAQ/common-inquiry assistant with escalation, while generative AI is for reviewed summaries and QA support, not customer-facing autonomous chat. |
| Auth target flow | `paper must change` | The paper still leans on username/password-style staff login language. | Update the target direction to `Google verification + email OTP`, and describe password-first flows only as legacy compatibility if they are mentioned at all. |
| External integrations | `paper must change` | The paper says there is no real-time third-party integration. | Correct this so it reflects current approved exceptions: Google identity verification, SMTP email delivery, and governed AI-provider integration policy. |

### Paper Evidence Checked

- `c:\Users\casio\Downloads\Copy of AUTOCARE.md`
  - loyalty direction: lines 29 and 501
  - auth and integration wording: lines 67 and 509-517
  - web and mobile framework direction: lines 331-342
  - chatbot, AI summary, and QA wording: lines 23-27, 41-48, and 426
  - push-notification wording: line 416

## System Changes

| Topic | Label | What should change in the system | Main surfaces to touch |
| --- | --- | --- | --- |
| Loyalty accrual direction | `system must change` | Expand loyalty from paid service only to paid service plus paid ecommerce. The trigger should stay payment-based or settlement-based, never order creation or cart creation. | Canonical docs, shared event contracts, loyalty accrual planner, loyalty service logic, loyalty tests |
| Mobile architecture docs | `system must change` | Correct stale architecture docs that still describe mobile as target-only or imply customer-facing UI is web-only. | `docs/architecture/system-architecture.md`, `docs/architecture/tasks/05-client-integration/README.md`, any related architecture summaries |
| Chatbot behavior | `already aligned` | Keep the current FAQ-guided, deterministic, escalation-aware direction. No generative chatbot expansion is needed. | Maintain current docs and UX wording consistency only |
| Auth and approved integrations | `already aligned` | Keep Google verification plus email OTP as the target model. Keep approved external exceptions. No rollback to password-first target state. | `docs/architecture/auth-security-policy.md`, `docs/architecture/api-strategy.md`, `docs/architecture/system-architecture.md` |
| Notifications transport | `already aligned` | Keep email-only notification transport. Do not add push-notification scope now. | `docs/architecture/domains/main-service/notifications.md`, notification schema and delivery code |

### Loyalty System Delta

The loyalty change is the only major system implementation change in this review.

#### What is already present

- The ecommerce service already emits `invoice.payment_recorded`.
- The loyalty schema already includes purchase-oriented source types:
  - `purchase_payment`
  - `purchase_reversal`

#### What is still blocking ecommerce loyalty

- Canonical docs still define loyalty as service-paid only:
  - `docs/architecture/domains/main-service/loyalty.md`
  - `docs/architecture/domain-map.md`
- Cross-domain docs explicitly forbid ecommerce payment as a loyalty trigger:
  - `docs/architecture/domains/ecommerce/commerce-events.md`
  - `docs/architecture/tasks/03-integration/T303-loyalty-from-service-and-purchase-events.md`
  - `docs/contracts/T303-loyalty-from-service-and-purchase-events.md`
- Shared event contracts do not yet route commerce payment facts to loyalty:
  - `backend/shared/events/contracts/commerce-events.ts`
- The accrual planner is still service-event-only:
  - `backend/shared/events/loyalty-accrual-planner.service.ts`
- The loyalty service currently accepts only service-envelope triggers or service-derived accrual plans:
  - `backend/apps/main-service/src/modules/loyalty/services/loyalty.service.ts`
- Earning-rule inputs are still service-specific:
  - `minimumPaidServiceAmountCents`
  - `eligibleServiceTypes`
  - `eligibleServiceCategories`
  - these appear in DTOs, repository snapshots, and matching logic under the loyalty module

#### Recommended implementation direction

- Keep the loyalty trigger payment-based:
  - paid service continues to use `service.payment_recorded`
  - paid ecommerce should use `invoice.payment_recorded` only when the invoice is actually settled or otherwise approved as a rewardable paid purchase fact
- Do not award points from:
  - `order.created`
  - invoice issuance
  - cart changes
  - unpaid checkout state
- Update the commerce event consumer list so loyalty becomes an explicit downstream consumer of the approved paid-purchase fact.
- Expand the loyalty accrual planner and service to accept both service and ecommerce paid-accrual paths.
- Review earning-rule modeling so it no longer assumes every accrual decision is based on service-only fields.
- Update tests to cover:
  - paid ecommerce accrual
  - duplicate delivery and idempotency
  - non-paid ecommerce states that must not accrue points

## Current Build and Tech Stack

### Web Build

- Workspace: `frontend/`
- Framework: `Next.js 15.3.0`
- UI runtime: `React 19`
- Standard build command: `next build`
- Repo script: `npm run build`
- Standard start command: `next start`
- Repo script: `npm run start`
- Notable web libraries: `lucide-react`, `recharts`, `tailwindcss`, `postcss`, `eslint`

### Mobile Build

- Workspace: `mobile/`
- Framework: `Expo SDK 54`
- Mobile runtime: `React Native 0.81.5`
- UI runtime: `React 19.1`
- Main workflow: Expo-managed app
- Main commands:
  - `expo start`
  - `expo start --android`
  - `expo start --ios`
  - `expo start --web`
- Repo scripts:
  - `npm run start`
  - `npm run android`
  - `npm run ios`
  - `npm run web`
- Notable mobile libraries: `@react-navigation/native`, `@react-navigation/stack`, `react-native-web`

### Backend and Infrastructure Stack

| Layer | Current stack |
| --- | --- |
| Backend services | `NestJS 11` + `TypeScript` |
| API contracts | `Swagger` / `OpenAPI` via `@nestjs/swagger` |
| Auth plumbing | `Passport`, `JWT`, `bcrypt` |
| Validation and DTOs | `class-validator`, `class-transformer` |
| Database | `PostgreSQL` with `pg` |
| ORM and schema tooling | `Drizzle ORM` + `drizzle-kit` |
| Jobs and retries | `BullMQ` + `Redis` |
| Eventing | `RabbitMQ` via Nest microservices and AMQP libraries |
| Email delivery | `Nodemailer` |
| Google identity verification | `google-auth-library` |
| Tests | `Jest`, `ts-jest`, `supertest` |

### Current Infra Snapshot

- `PostgreSQL 16`
- `Redis 7`
- `RabbitMQ 3-management`

## Verification Sources

### Paper

- `c:\Users\casio\Downloads\Copy of AUTOCARE.md`

### Canonical docs

- `docs/architecture/system-architecture.md`
- `docs/architecture/auth-security-policy.md`
- `docs/architecture/api-strategy.md`
- `docs/architecture/domain-map.md`
- `docs/architecture/domains/main-service/loyalty.md`
- `docs/architecture/domains/main-service/chatbot.md`
- `docs/architecture/domains/main-service/notifications.md`
- `docs/architecture/domains/ecommerce/commerce-events.md`
- `docs/architecture/tasks/05-client-integration/README.md`
- `docs/architecture/tasks/03-integration/T303-loyalty-from-service-and-purchase-events.md`
- `docs/contracts/T303-loyalty-from-service-and-purchase-events.md`
- `docs/contracts/T114-faq-chatbot-v1.md`

### Live repo code and manifests

- `frontend/package.json`
- `mobile/package.json`
- `mobile/README.md`
- `backend/package.json`
- `backend/docker-compose.yml`
- `backend/shared/events/contracts/service-events.ts`
- `backend/shared/events/contracts/commerce-events.ts`
- `backend/shared/events/loyalty-accrual-planner.service.ts`
- `backend/apps/main-service/src/modules/loyalty/services/loyalty.service.ts`
- `backend/apps/main-service/src/modules/loyalty/schemas/loyalty.schema.ts`
- `backend/apps/main-service/src/modules/chatbot/controllers/chatbot.controller.ts`
- `backend/apps/main-service/src/modules/notifications/schemas/notifications.schema.ts`
