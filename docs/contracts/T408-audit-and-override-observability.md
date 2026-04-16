# T408 Audit And Override Observability

## Summary

This slice makes sensitive staff actions traceable without moving source-of-truth ownership into analytics.

Implemented outcomes:
- auth now writes durable staff-admin audit logs for staff provisioning and staff activation-status changes
- quality-gates now emits explicit audit signals when a blocked QA gate is manually overridden
- analytics now exposes a rebuildable `audit-trail` snapshot that reads staff-admin actions, QA overrides, and release decisions

## Live Interfaces

- `GET /api/analytics/audit-trail`

## Source Audit Facts

- `main-service.auth`
  - `staff_admin_audit_logs`
  - actions:
    - `staff_account_provisioned`
    - `staff_account_status_changed`
- `main-service.quality-gates`
  - `quality_gate_overrides`
- `main-service.job-orders`
  - immutable service invoice records as release-decision evidence

## Audit Events

- `staff_account.provisioned`
- `staff_account.status_changed`
- `quality_gate.overridden` via the shared lifecycle-event contract

These events are observability signals only. They do not replace the source-domain writes.

## Audit-Trail Response Shape

- `refreshedAt`
- `refreshJobId`
- `totals`
  - `totalSensitiveActions`
  - `staffAdminActions`
  - `qualityGateOverrides`
  - `releaseDecisions`
- `entries[]`
  - `auditType`
  - `action`
  - `occurredAt`
  - `actorUserId`
  - `actorRole`
  - `reason`
  - `summary`
  - `sourceDomain`
  - `sourceId`
  - `targetEntityType`
  - `targetEntityId`
  - `relatedEntityIds`

## Frontend Notes

- use the audit trail for admin observability views only
- do not treat it as the source of truth for staff-account state or QA state
- render `reason` as optional because provisioning entries may not carry one
