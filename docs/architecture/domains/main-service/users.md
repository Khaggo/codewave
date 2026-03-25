# users

## Purpose

Own customer identity, profile metadata, saved addresses, and user-facing account state that is not credential-specific.

## Owned Data / ERD

Primary tables or equivalents:
- `users`
- `user_profiles`
- `addresses`
- `user_preferences`

Key relations:
- one `users` record may have one `user_profiles` record
- one user may have many saved addresses
- user IDs are referenced by vehicles, bookings, insurance, loyalty, notifications, and e-commerce identities

Ownership notes:
- saved customer addresses live here
- order delivery or billing snapshots belong to `orders`, not `users`

## Primary Business Logic

- create and update customer identity data
- manage profile completeness
- manage saved addresses and default selections
- distinguish user-visible fields from internal flags such as account status
- expose stable IDs that other domains can reference

## Process Flow

1. User record is created during signup or admin provisioning
2. Profile details are completed over time
3. Vehicles, bookings, insurance, and orders reference the user ID
4. Saved addresses are reused by checkout or profile operations

## Use Cases

- customer updates profile
- customer manages saved addresses
- staff searches a customer record
- other domains resolve the owner of a vehicle or booking

## API Surface

- `POST /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `GET /users/:id/addresses`
- `POST /users/:id/addresses`
- `PATCH /users/:id/addresses/:addressId`

## Edge Cases

- duplicate accounts for the same person
- deleting an address that is still default or referenced elsewhere
- exposing internal-only flags to customer views
- soft-deleted user with active operational records

## Dependencies

- `auth` for authenticated access
- referenced by almost all customer-facing domains

## Out of Scope

- password and session logic
- vehicle ownership transfer rules
- order snapshot address ownership
