# Release Checklist

## Before Merge

- Required CI and CODEOWNERS review pass.
- API and database compatibility are documented.
- Relevant tests and responsive UI checks pass.
- No credential, runtime output, generated build, or local screenshot is staged.

## Before Deploy

- `npm run check`, production builds, and dependency audits pass.
- Drizzle migrations pass against an empty database and a current-schema copy.
- Railway environment variables and health paths are verified.
- Operational scripts remain in dry-run unless the approved release step requires execution.

## After Deploy

- Main API, ecommerce API, staff web, and customer mobile API discovery are healthy.
- Login, Booking to Job Order, QA, Finalization, Payment, and notification smoke flows pass.
- Logs show no new authorization, migration, contract, or unhandled request errors.
- Rollback owner and deployment identifier are recorded in the release note.
