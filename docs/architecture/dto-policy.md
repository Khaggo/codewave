# DTO Policy

This file defines the canonical DTO policy for the AUTOCARE backend. Use it whenever a domain exposes REST endpoints or needs stable transport contracts.

## Policy Goal

- make request and response contracts explicit
- keep controller payloads stable and machine-readable
- keep validation and Swagger behavior consistent across domains
- prevent raw persistence shapes from leaking into public APIs

## Default Rule

- use DTOs for all public REST inputs
- use response DTOs for all public REST outputs
- keep DTOs in `src/modules/<domain>/dto/`
- treat DTOs as transport contracts, not as the domain model
- align all new REST domains with the `main-service.auth` and `main-service.users` reference pair

## Request DTO Policy

- every controller input body should use a request DTO class
- request DTOs should own transport-level validation
- request DTOs should use `class-validator`
- request DTOs exposed in Swagger should use `@ApiProperty` or `@ApiPropertyOptional`
- path params and query params may stay lightweight if simple, but promote them to DTOs when validation or reuse becomes non-trivial

## Response DTO Policy

- every public REST response should use an explicit response DTO when the payload is non-trivial
- do not return raw Drizzle records directly from controllers
- response DTOs should be stable even if persistence tables change internally
- nested public payloads should use nested response DTOs where needed
- Swagger output models should point to the explicit response DTO classes

## Layer Boundaries

- controllers speak in DTOs
- services orchestrate domain logic and may map between domain objects and DTO-ready shapes
- repositories should not depend on response DTOs
- schemas define persistence shape, not transport shape
- do not move business rules into DTO classes beyond transport validation concerns

## Naming Standard

- use `CreateXDto` for create requests
- use `UpdateXDto` for update requests
- use `UpsertXDto` only when one transport shape intentionally serves both create and update behavior
- use `XResponseDto` for standard public outputs
- use specialized response names when needed, such as `AuthSessionResponseDto`
- keep DTO names local to the domain unless a shared transport contract is explicitly owned cross-domain

## Validation and Swagger

- DTOs are the default place for request validation annotations
- Swagger contracts should be generated from DTO classes, not inferred from raw objects
- documented routes must use DTOs that match implemented controller behavior
- if a domain exposes public REST endpoints, DTOs are required unless the payload is truly trivial and intentionally documented otherwise
- current reference implementation lives in `main-service.auth` and `main-service.users`

## Allowed Exceptions

- internal-only helpers, event payload interfaces, and queue job payload types do not need to be controller DTOs
- very small internal endpoints may avoid dedicated response DTOs only when the payload is trivial and stable
- RabbitMQ payloads and BullMQ job payloads should use typed contracts or interfaces, but they do not have to follow REST DTO naming
- if a domain is not exposing REST yet, DTO scaffolding may wait until the public transport boundary exists
