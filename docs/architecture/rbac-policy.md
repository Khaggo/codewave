# RBAC Policy

This file defines the canonical role model and permission guardrails for staff-facing and admin-facing behavior across the AUTOCARE backend.

## Role Model

- Canonical roles are `customer`, `technician`, `service_adviser`, and `super_admin`.
- `customer` is the default external role for booking, vehicle ownership, inquiry, and purchase history behavior.
- `technician` is the execution role for job-order progress, work evidence, and assigned operational updates.
- `service_adviser` is the intake and coordination role for bookings, customer communication, job-order creation, and release readiness review.
- `super_admin` is the high-trust administrative role for staff provisioning, deactivation, override approval, and system-wide reporting.

## Permission Boundaries

- `customer` may create and review only their own bookings, vehicles, addresses, inquiries, order history, and reviewed lifecycle summaries.
- `technician` may update assigned job-order progress, work notes, and photo evidence, but may not provision staff, publish reviewed summaries, or approve quality-gate overrides.
- `service_adviser` may confirm, decline, or reschedule bookings, create and manage job orders, coordinate customer communication, and prepare invoices from completed job orders.
- `super_admin` may create and deactivate staff accounts, assign or revoke staff roles, approve or reject manual QA overrides, and review sensitive audit trails.
- Cross-domain actions must check both the actor role and record ownership or assignment context.

| Action | customer | technician | service_adviser | super_admin |
| --- | --- | --- | --- | --- |
| Self-enroll and activate own account | allowed | no | no | no |
| Read own vehicles, bookings, and addresses | allowed | no | no | no |
| Update assigned job progress | no | allowed | no | allowed |
| Confirm, decline, or reschedule appointments | no | no | allowed | allowed |
| Create or finalize job orders | no | no | allowed | allowed |
| Provision or deactivate staff accounts | no | no | no | allowed |
| Approve QA override decisions | no | no | no | allowed |
| Review system-wide audit data | no | no | limited | allowed |

## Administrative Provisioning

- Staff accounts are provisioned through admin-owned flows, not self-service registration.
- Admin endpoints are `POST /admin/staff-accounts` and `PATCH /admin/staff-accounts/:id/status`.
- Provisioned staff identities start in `pending_activation` and must complete Google verification plus email OTP before they become usable.
- Staff deactivation must preserve historical ownership on job orders, overrides, and audit logs.
- Role escalation from `customer` to staff roles requires explicit super-admin action and audit logging.
- Auth and users remain the identity-owning domains even when staff provisioning expands.

## Digital Identifier Rules

- Staff-capable accounts require a stable `staff_code` or equivalent digital identifier.
- `service_adviser` identity must be snapshotted on job orders and invoice records so later staff changes do not rewrite historical responsibility.
- Adviser snapshots should store both the immutable adviser identifier and the user reference used at creation time.
- Technician assignments may reference mutable user records, but completed operational records should retain enough snapshot detail for audits.

## Audit Expectations

- Staff provisioning, deactivation, role changes, and manual QA overrides must be audit-visible.
- Permission failures should be deterministic and explainable at the API boundary.
- Sensitive role transitions and override actions should emit analytics or audit signals without changing source-of-truth ownership.
- Domain docs may reference local role checks, but must not redefine the canonical role set outside this file.
