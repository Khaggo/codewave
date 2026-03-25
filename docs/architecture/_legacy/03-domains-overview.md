# Domains Overview

This document groups the system by domain ownership rather than by UI screen.

## Main Service Domains

### Accounts and Profiles

- user registration and login
- profile management
- customer identity ownership

### Vehicles

- vehicle records
- vehicle metadata
- ownership link to customer

### Bookings

- service selection
- time slot management
- booking state tracking
- booking status history

### Vehicle Lifecycle

- consolidated vehicle timeline
- administrative lifecycle events
- verified condition-sensitive milestones

### Inspections

- intake inspection
- pre-repair or pre-service inspection
- completion inspection
- return/back-job inspection

### Insurance

- inquiry submission
- quotation tracking
- document uploads
- record visibility when available

### Loyalty

- points accumulation
- reward redemption
- customer retention tracking

### Back Jobs

- return/rework cases
- linkage to original work
- resolution tracking

### Job Monitoring

- progress monitoring
- technician assignment visibility
- support for current job board process

### Notifications

- reminders
- booking updates
- insurance renewal alerts

### Chatbot

- rule-based guided inquiry handling
- FAQ-like customer assistance

### Analytics

- operational reporting
- lifecycle and back-job metrics
- customer activity summaries

## E-Commerce Service Domains

### Catalog

- product categories
- product listing
- product metadata

### Inventory

- stock tracking
- reserve and deduction behavior
- service-material monitoring if needed

### Cart

- cart creation
- cart items
- pre-checkout preparation

### Orders

- invoice-based checkout
- order tracking
- purchase history

### Invoice Payments

- invoice number and status
- payment states such as pending, partial, and paid
- tracking-only payment view

### Commerce Events

- order completed
- inventory-related events
- sales summary signals for downstream consumers

## Ownership Boundaries

- Main service owns lifecycle, inspections, bookings, back jobs, loyalty, insurance, and customer behavior.
- E-commerce owns products, inventory, carts, orders, and invoice payment tracking.
- Cross-domain logic should happen through:
  - events
  - explicit service contracts
  - reporting read models

## What Must Stay Out of Shared Base Abstractions

- lifecycle verification rules
- back-job classification logic
- inspection requirements
- invoice payment state semantics
- loyalty earning and redemption rules
- customer-visible vs internal-only note rules
