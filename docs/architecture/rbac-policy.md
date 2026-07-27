# RBAC Policy

This file defines the canonical role model and permission guardrails for customer-facing, staff-facing, and admin-facing behavior across AUTOCARE.

Last updated: 2026-05-23

Status: Active. This file reflects the adviser-owned workshop model extracted from the implementation chat and the latest QA/source-of-truth updates.

## Role Model

- Canonical authenticated roles are `customer`, `service_adviser`, and `super_admin`.
- `customer` is the default external role for booking, vehicle ownership, inquiry, and purchase history behavior.
- `service_adviser` is the staff operating role for bookings, customer communication, job-order creation, technician-profile assignment, adviser-owned workshop stages, QA release, and invoice handoff.
- `super_admin` is the high-trust administrative role for staff provisioning, deactivation, override approval, and system-wide reporting.
- Technician web logins are intentionally retired in the active product model.
- Technicians are represented as non-auth operational profiles with specialties, not authenticated staff roles.
- A technician profile may be assigned to a job order with a selected specialty and checklist/PDF/evidence expectations, but the authenticated actor remains the service adviser or super admin.

## Retired Role Compatibility

- Any old technician-authenticated login path must be treated as retired.
- Retired workshop accounts should be blocked with explicit retirement copy rather than silently failing.
- QA must not treat retired technician login failure as a product bug when the retirement message is shown.
- Historical records may still mention technician-profile or legacy workshop labels. Documentation and UI should distinguish those historical labels from current authenticated roles.

## Permission Boundaries

- `customer` may create and review only their own bookings, vehicles, addresses, inquiries, order history, and reviewed lifecycle summaries.
- `service_adviser` may confirm, decline, or reschedule bookings, create and manage job orders, assign technician profiles, advance workshop stages, record checklist/progress/evidence, perform QA release in the active flow, coordinate customer communication, and prepare invoices from completed job orders.
- `super_admin` may create and deactivate staff accounts, assign or revoke staff roles, approve or reject privileged manual overrides, manage technician profile directory data, and review sensitive audit trails.
- Cross-domain actions must check both the authenticated actor role and record ownership, customer ownership, adviser responsibility, or technician-profile assignment context.

| Action | customer | service_adviser | super_admin |
| --- | --- | --- | --- |
| Self-enroll and activate own account | allowed | no | no |
| Read own vehicles, bookings, and addresses | allowed | no | no |
| Confirm, decline, or reschedule appointments | no | allowed | allowed |
| Create job orders from booking handoff | no | allowed | allowed |
| Assign technician profiles and selected specialties | no | allowed | allowed |
| Advance workshop stages | no | allowed | allowed |
| Record checklist/progress/evidence | no | allowed | allowed |
| Generate printable technician checklist PDF | no | allowed | allowed |
| Perform active-flow QA release | no | allowed | allowed |
| Finalize job orders and prepare invoice handoff | no | allowed | allowed |
| Provision or deactivate staff accounts | no | no | allowed |
| Manage technician profile directory | no | allowed | allowed |
| Approve privileged manual override decisions | no | no | allowed |
| Review system-wide audit data | no | limited | allowed |

## Administrative Provisioning

- Staff accounts are provisioned through admin-owned flows, not self-service registration.
- Admin endpoints are `POST /admin/staff-accounts` and `PATCH /admin/staff-accounts/:id/status`.
- Provisioned staff identities start in `pending_activation` and must complete Google verification plus email OTP before they become usable.
- Staff deactivation must preserve historical ownership on job orders, overrides, and audit logs.
- Role escalation from `customer` to staff roles requires explicit super-admin action and audit logging.
- Auth and users remain the identity-owning domains even when staff provisioning expands.
- Technician-profile directory management is operational data management, not staff authentication provisioning.
- Technician profiles should support specialties and assignment history without creating login access.

## Digital Identifier Rules

- Staff-capable accounts require a stable `staff_code` or equivalent digital identifier.
- `service_adviser` identity must be snapshotted on job orders and invoice records so later staff changes do not rewrite historical responsibility.
- Adviser snapshots should store both the immutable adviser identifier and the user reference used at creation time.
- Technician-profile assignments should snapshot the profile label, selected specialty, and assignment context so completed operational records remain auditable even if the profile changes later.
- Customer-facing and staff-facing references should use business-readable references instead of raw UUIDs or UUID fragments.

## Audit Expectations

- Staff provisioning, deactivation, role changes, technician-profile assignment, workshop-stage changes, QA release actions, and manual QA overrides must be audit-visible.
- Permission failures should be deterministic and explainable at the API boundary.
- Sensitive role transitions and override actions should emit analytics or audit signals without changing source-of-truth ownership.
- Domain docs may reference local role checks, but must not redefine the canonical authenticated role set outside this file.

## QA Evidence Notes

- The latest full-system Playwright gate is green under the adviser-owned workshop model: 20 passed, 0 failed.
- Role-access QA expects service adviser access to Job Orders and QA Audit.
- Role-access QA expects retired technician accounts to be blocked with explicit retirement copy.
- Checklist-only workshop proof is validated through adviser-owned technician-profile assignment, checklist/PDF export, evidence guardrails, and submit locking.
