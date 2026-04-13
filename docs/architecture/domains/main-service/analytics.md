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
- `customer_activity_logs`
- `audit_logs`
- `analytics_snapshots`
- domain-specific summary tables or materialized views

Key relations:
- analytics consumes many modules but should not own their transactional writes
- snapshot tables are rebuildable from source systems and events

## Primary Business Logic

- aggregate operational metrics for admins and managers
- track service demand, repeat issues, back-job rate, loyalty usage, insurance activity, booking peaks, and invoice aging
- build dashboards without becoming the source of truth for core workflows
- support auditability around important actions

## Process Flow

1. Source modules emit events or write activity logs.
2. Background jobs aggregate and refresh summary tables.
3. Dashboards read from analytics-focused models.
4. Discrepancies are traced back to source-module records.

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
- internal `refreshAnalyticsSnapshot`

## Edge Cases

- analytics snapshot lags behind source systems
- denormalized data becomes inconsistent after source correction
- audit logging is incomplete for sensitive actions
- dashboards are treated as transactional truth instead of derived views

## Writable Sections

- analytics read-model definitions, KPI semantics, refresh behavior, analytics APIs, and analytics edge cases
- do not redefine source-domain transaction rules here

## Out of Scope

- owning operational writes
- replacing admin search screens or raw transaction views
