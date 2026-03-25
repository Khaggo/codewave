# bookings

## Purpose

Own service appointment planning: service catalog for appointments, time slots, booking records, requested services, and booking status history.

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
- job monitoring may later operationalize an approved booking

Core states:
- `draft`
- `pending`
- `confirmed`
- `rescheduled`
- `completed`
- `cancelled`
- `declined`

## Primary Business Logic

- expose available services and time slots
- create bookings against customer and vehicle records
- validate booking capacity and time-slot availability
- track status changes in a separate history table
- publish events for reminders, lifecycle updates, and downstream operations

## Process Flow

1. Customer selects vehicle, services, and preferred slot
2. Booking is created and validated
3. Staff confirms, declines, or reschedules
4. Reminder flows and operational prep begin
5. Completed bookings may feed inspections, job monitoring, loyalty, and lifecycle updates

## Use Cases

- customer books service
- staff approves or reschedules appointment
- admin reviews booking history and demand

## API Surface

- `GET /services`
- `GET /time-slots`
- `POST /bookings`
- `GET /bookings/:id`
- `PATCH /bookings/:id/status`
- `POST /bookings/:id/reschedule`
- `GET /users/:id/bookings`

## Edge Cases

- slot becomes unavailable during concurrent booking requests
- booking references a vehicle not owned by the customer
- repeated status updates create inconsistent history
- completed booking without follow-up inspection when one is required operationally

## Dependencies

- `users`
- `vehicles`
- `notifications`
- `vehicle-lifecycle`
- `job-monitoring`
- `loyalty`

## Out of Scope

- physical inspection results
- technician execution logs
- product checkout flows
