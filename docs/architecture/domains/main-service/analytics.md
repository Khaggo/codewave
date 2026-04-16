# analytics

## Domain ID

`main-service.analytics`

## Agent Summary

Load this doc for derived dashboards, KPIs, audit-friendly read models, and rebuildable summaries. Skip it for transactional source-of-truth behavior.

## Primary Objective

Provide useful reporting and audit views without becoming the write owner or source of truth for operational workflows.

## Inputs

- source-domain activity logs
- outbox or event feeds
- batch refresh jobs

## Outputs

- analytics snapshots
- KPI summaries
- audit and trend views

## Dependencies

- cross-domain inputs from both services

## Owned Data / ERD

Primary tables or equivalents:
- `analytics_snapshots`
- `analytics_refresh_jobs`
- rebuildable dashboard, aging, loyalty, back-job, and audit-trail payloads inside analytics snapshots

Key relations:
- analytics consumes many modules but should not own their transactional writes
- snapshot tables are rebuildable from source systems and events
- source-domain audit rows remain owned by domains such as `auth` and `quality-gates`

## Primary Business Logic

- aggregate operational metrics for admins and managers
- track service demand, repeat issues, back-job rate, loyalty usage, insurance activity, booking peaks, and invoice aging
- build dashboards without becoming the source of truth for core workflows
- expose an audit trail for staff-admin actions, QA overrides, and release decisions by reading source-domain audit facts
- current v1 sales signals come from service invoice-record counts, not payment-settlement totals
- current v1 invoice-aging view is derived from reminder policies in `notifications`, so it stays aligned with live reminder behavior

## Process Flow

1. Source modules create or update transactional records in their owning domains.
2. Analytics refresh jobs derive and upsert rebuildable analytics snapshots plus refresh-job audit rows.
3. Dashboards read only from analytics-focused snapshot payloads.
4. Discrepancies are traced back to source-module records through snapshot trace fields and refresh-job source counts.

## Use Cases

- manager reviews booking conversion and slot usage
- manager reviews peak hours, most-availed services, and sales trends
- operations reviews back-job trends and technician workload
- finance-related staff reviews unpaid invoice aging summaries
- admins audit who changed sensitive statuses

## API Surface

- `GET /analytics/dashboard`
- `GET /analytics/back-jobs`
- `GET /analytics/loyalty`
- `GET /analytics/invoice-aging`
- `GET /analytics/operations`
- `GET /analytics/audit-trail`
- internal `refreshAnalyticsSnapshot`

## Edge Cases

- analytics snapshot lags behind source systems
- denormalized data becomes inconsistent after source correction
- audit-trail coverage drifts if new sensitive actions skip source-domain audit hooks
- dashboards are treated as transactional truth instead of derived views
- invoice-aging counts drift if reminder policies are not refreshed after payment-related events
- admins misread service-invoice counts as settled revenue totals before payment settlement analytics exists

## Writable Sections

- analytics read-model definitions, KPI semantics, refresh behavior, analytics APIs, and analytics edge cases
- do not redefine source-domain transaction rules here

## Out of Scope

- owning operational writes
- replacing admin search screens or raw transaction views
