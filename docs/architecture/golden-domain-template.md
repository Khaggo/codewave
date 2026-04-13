# Golden Domain Template

This file is the reusable baseline for creating new backend domains. Use it together with `main-service.auth` and `main-service.users` when you want consistency in both documentation shape and code shape.

## Reference Purpose

- give agents one reusable template instead of relying on informal imitation
- capture the stable patterns already proven in `auth` and `users`
- keep new domains consistent in docs, module layout, Swagger surface, and minimum testing

## Domain Doc Contract

Every canonical domain doc must use this exact order:

1. `Domain ID`
2. `Agent Summary`
3. `Primary Objective`
4. `Inputs`
5. `Outputs`
6. `Dependencies`
7. `Owned Data / ERD`
8. `Primary Business Logic`
9. `Process Flow`
10. `Use Cases`
11. `API Surface`
12. `Edge Cases`
13. `Writable Sections`
14. `Out of Scope`

Rules:
- keep the `Agent Summary` short enough for cheap routing
- keep dependencies direct, not transitive
- keep domain truth local and move shared rules back to `system-architecture.md`
- keep planned but unimplemented behavior out of the canonical domain doc

## Code Module Contract

New domains should default to this module shape:

```text
src/modules/<domain>/
  <domain>.module.ts
  controllers/
  dto/
  repositories/
  schemas/
  services/
```

Optional folders are allowed only when justified by real behavior:
- `guards/`
- `strategies/`
- `mappers/`
- `constants/`

Rules:
- controllers stay transport-focused
- services own domain orchestration
- repositories own persistence and query composition
- schemas define Drizzle tables, relations, and persistence-level enums
- optional folders must not be created just to mirror another domain mechanically

## API Documentation Contract

For externally exposed endpoints:
- controllers must be Swagger-decorated
- request DTOs must use `@ApiProperty` or `@ApiPropertyOptional`
- response DTOs should be explicit for public payloads
- documented routes must match implemented controller routes exactly
- canonical domain docs must not advertise public endpoints that do not exist in code
- transport decisions must follow [`api-strategy.md`](./api-strategy.md) instead of being reinvented per domain
- DTO decisions must follow [`dto-policy.md`](./dto-policy.md) instead of becoming domain-specific guesses
- if the domain participates in a frontend slice, contract packs must label routes as `live` or `planned` according to [`frontend-backend-sync.md`](./frontend-backend-sync.md)

Recommended minimum Swagger coverage:
- tag the controller
- summarize each public route
- document success responses
- document common failure responses
- require bearer auth only where it actually exists

## Minimum Test Baseline

Every new domain should have at least:
- one service-level happy-path test
- one direct validation of the main business entrypoint
- one assertion that the repository or service boundary is called as expected

Recommended next step after the baseline:
- add failure-path tests for domain-specific edge cases
- add contract tests when the domain exposes public APIs or events

## Naming and Ownership Rules

- domain names are kebab-case in docs and folders
- `Domain ID` follows `<service>.<domain>`
- canonical domain files live under `docs/architecture/domains/<service>/`
- domain docs describe only what the code currently owns
- future ideas go to backlog notes, not canonical domain contracts
- cross-domain ownership belongs in `system-architecture.md` and `domain-map.md`, not duplicated across many domains

## Reference Starter Domains

Use these as the first code-and-doc examples:
- [`main-service.users`](./domains/main-service/users.md): baseline identity, profile, address, repository transaction, and update flow
- [`main-service.auth`](./domains/main-service/auth.md): baseline Swagger auth contract, JWT guard usage, token issuance, and refresh behavior

When creating a new domain, load in this order:
1. [`README.md`](./README.md)
2. [`system-architecture.md`](./system-architecture.md)
3. [`api-strategy.md`](./api-strategy.md)
4. [`dto-policy.md`](./dto-policy.md)
5. [`frontend-backend-sync.md`](./frontend-backend-sync.md) when the domain will be used by frontend before full backend completion
6. this file
7. [`main-service.users`](./domains/main-service/users.md)
8. [`main-service.auth`](./domains/main-service/auth.md)
