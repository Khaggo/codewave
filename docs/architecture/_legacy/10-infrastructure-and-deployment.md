# Infrastructure and Deployment

This document summarizes the runtime and local setup direction currently implied by the repo and the plan.

## Local Database Setup

The current backend notes already point to Docker-based PostgreSQL.

### Current Docker Compose Direction

- PostgreSQL 16
- container name: `postgre_db`
- database: `codewave`
- host port: `5432`
- persistent volume: `postgres_data`

### Current Compose File

- service name: `postgres`
- connects from host using `localhost:5432`
- connects from another container using service name `postgres`

## Deployment Split

### Main Service

- NestJS service for operational domains
- should own its own PostgreSQL schema/database boundary

### E-Commerce Service

- NestJS service for commerce domains
- should own its own PostgreSQL schema/database boundary

### Supporting Infrastructure

- Redis for BullMQ
- RabbitMQ for cross-domain events

## Async Responsibilities

### BullMQ + Redis

Use for:
- reminders
- notification retries
- lifecycle read-model refresh
- analytics rebuild jobs
- inventory-related support jobs

### RabbitMQ

Use for:
- order completion events
- loyalty update requests
- analytics update events
- inventory-related domain signals when needed

## Practical Deployment Guidance

- Keep service ownership explicit from the start.
- Avoid direct shared-table coupling between the two services.
- Prefer environment-specific configuration for:
  - database URLs
  - Redis connection
  - RabbitMQ connection
  - notification providers

## Current Repo Context

- `backend/docker-compose.yml` already exists for Postgres
- `backend/database setup.md` already explains the Docker Postgres workflow
- no broader production deployment structure exists yet in the repo, so this document is a planning guide rather than an operations runbook
