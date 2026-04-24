# bookings

## Domain ID

`main-service.bookings`

## Agent Summary

Load this doc for appointment planning, services, time slots, booking state, staff schedule actions, and optional queue visibility. Skip it for technician execution and inspection evidence.

## Primary Objective

Own service appointment planning and booking state transitions without absorbing technician execution or physical verification logic.

## Inputs

- selected user and vehicle
- requested services
- preferred time slot
- availability-window query inputs such as date range
- staff slot-definition updates
- approval, decline, or reschedule actions
- authenticated service-adviser or super-admin scheduling decisions

## Outputs

- booking records
- booking service selections
- booking status history
- booking availability read models
- daily-schedule and optional queue views
- reminder and downstream operational triggers

## Dependencies

- `main-service.users`
- `main-service.vehicles`

## Owned Data / ERD

Primary tables or equivalents:
- `service_categories`
- `services`
- `time_slots`
- `bookings`
- `booking_services`
- `booking_status_history`

Key relations:
- one booking belongs to one user and one vehicle
- one booking may contain many requested services through `booking_services`
- one booking has many status history entries

## Primary Business Logic

- expose available services and time slots
- let service advisers and super admins manage slot label, time window, capacity, and active state
- own booking-date availability rules so customer-facing calendars do not invent open days locally
- create bookings against customer and vehicle records
- validate booking capacity and time-slot availability
- apply the same availability rules to booking create and staff reschedule paths
- support authenticated service-adviser confirmation, decline, and reschedule actions
- track status changes in a separate history table
- keep booking changes structured so reminders, lifecycle updates, and downstream operations can hook in without redefining booking truth

## Process Flow

1. Customer selects vehicle, services, and a preferred slot.
2. Booking is created and validated.
3. Staff confirms, declines, or reschedules.
4. Reminder flows and operational preparation begin.
5. Completed bookings may feed inspections, job orders, loyalty, and lifecycle updates.

## Use Cases

- customer books service
- customer checks which dates are still bookable before submitting a booking
- staff approves or reschedules an appointment
- staff manages slot definitions and publishes or pauses booking capacity
- service adviser reviews the daily schedule and queue pressure
- admin reviews booking history and demand

## API Surface

- `GET /services`
- `GET /time-slots`
- `POST /time-slots`
- `PATCH /time-slots/:id`
- `POST /bookings`
- `GET /bookings/:id`
- `PATCH /bookings/:id/status`
- `POST /bookings/:id/reschedule`
- `GET /bookings/daily-schedule`
- `GET /queue/current`
- `GET /users/:id/bookings`

## Edge Cases

- slot becomes unavailable during concurrent booking requests
- client-generated booking dates drift from booking-owned availability rules
- booking references a vehicle not owned by the customer
- repeated status updates create inconsistent history
- unauthenticated or non-staff actors attempt staff-only schedule operations
- inactive slot definitions remain visible to staff but must stop appearing as customer-bookable choices
- queue view drifts from confirmed booking state
- completed booking without follow-up inspection when one is operationally required

## Writable Sections

- booking ERD, booking status rules, slot and service behavior, booking APIs, and booking edge cases
- do not edit technician execution, lifecycle verification, or loyalty semantics here

## Out of Scope

- physical inspection results
- technician execution logs
- product checkout flows
