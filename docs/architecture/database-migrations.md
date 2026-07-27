# Database Migration Operations

## Agent Summary

Production schema changes use committed Drizzle migrations. Schema push is limited to local,
disposable databases. Existing environments must baseline the initial migration only after their
schema is verified to match it.

## Commands

- `npm --workspace backend run db:generate`: generate a reviewed SQL migration and snapshot.
- `npm --workspace backend run db:check`: validate migration journal consistency.
- `npm --workspace backend run db:migrate`: apply pending committed migrations.
- `npm --workspace backend run db:push:local`: synchronize only a local disposable database.

## Existing Environment Baseline

The initial `0000` migration represents the schema at workspace conversion. Do not run it blindly
against an existing database. First restore a production backup into an isolated database, compare
it with the Drizzle schema, and record the initial migration in the Drizzle journal only through an
approved, reviewed baseline operation.

Until that rehearsal passes, Railway deployment must keep migration execution as an explicit
release step. Afterward, the main API service may run `db:migrate` as its pre-deploy command.

## Release Evidence

Each database release records the migration names, database fingerprint, dry-run or rehearsal
result, backup identifier, owner, rollback strategy, and post-migration health result.
