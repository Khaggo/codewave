# Catalog V1

## Task ID

`T202`

## Title

Build the first ecommerce catalog module.

## Type

`domain`

## Status

`done`

## Priority

`medium`

## Owner Role

`domain-worker`

## Source of Truth

- `../../domains/ecommerce/catalog.md`
- `../../api-strategy.md`

## Depends On

- `T201`

## Goal

Implement products and categories so ecommerce has a stable catalog foundation before cart, orders, and invoice tracking are added.

## Deliverables

- catalog schema and module
- product and category endpoints
- catalog DTO and Swagger contracts

## Implementation Notes

- keep catalog ownership inside ecommerce-service
- no inventory mutation logic here

## Acceptance Checks

- products and categories can be listed and managed
- Swagger documents the exposed catalog routes

## Out of Scope

- cart behavior
