# analytics

## Purpose

Own reporting read models, KPI aggregation, and operational dashboards derived from core transactional modules.

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
- track service demand, repeat issues, back-job rate, loyalty usage, and invoice aging
- build dashboards without becoming the source of truth for core workflows
- support auditability around important actions

## Process Flow

1. Source modules emit events or write activity logs
2. Background jobs aggregate and refresh summary tables
3. Dashboards read from analytics-focused models
4. Discrepancies are traced back to source module records

## Use Cases

- manager reviews booking conversion and slot usage
- operations team reviews back-job trends and technician workload
- finance-related staff reviews unpaid invoice aging summaries
- admins audit who changed statuses or closed work

## API Surface

- `GET /analytics/dashboard`
- `GET /analytics/back-jobs`
- `GET /analytics/loyalty`
- `GET /analytics/invoice-aging`
- internal `refreshAnalyticsSnapshot`

## Edge Cases

- analytics snapshot lags behind source systems
- denormalized data becomes inconsistent after source correction
- audit logging is incomplete for sensitive actions
- dashboards are treated as transactional truth instead of derived views

## Dependencies

- almost all operational domains
- BullMQ for batch refresh
- RabbitMQ or outbox for event-fed aggregation

## Out of Scope

- owning operational writes
- replacing admin search screens or raw transaction views
