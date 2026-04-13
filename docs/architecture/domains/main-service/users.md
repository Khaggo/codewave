# users

## Domain ID

`main-service.users`

## Agent Summary

This is one of the golden reference domains. Load it for customer identity, profile, saved addresses, pending-account state, and staff identifiers. Skip it for password, session, token, or OTP behavior.

## Primary Objective

Own customer and staff identity records so every other domain can reference a stable user record without taking ownership of profile semantics.

## Inputs

- signup or admin-provisioning requests
- profile updates
- address management requests

## Outputs

- stable user IDs for dependent domains
- `users`
- `user_profiles`
- `addresses`
- user-visible and internal account-state fields such as `role`, `staff_code`, `isActive`, and pending-activation markers coordinated with auth

## Dependencies

- none

## Owned Data / ERD

Primary tables or equivalents:
- `users`
- `user_profiles`
- `addresses`

Key relations:
- one `users` record may have one `user_profiles` record
- one user may have many saved addresses
- staff-capable users carry a stable `staff_code` for audit snapshots and operational ownership
- customer and staff identities may exist in a pending-activation state until auth completes Google verification and email OTP
- user IDs are referenced by vehicles, bookings, insurance, loyalty, notifications, and e-commerce identities

## Primary Business Logic

- create customer identity data and store managed staff identities provisioned by the auth domain
- update profile fields while keeping staff activation under admin-owned auth flows
- manage saved addresses and default-address switching
- distinguish user-visible fields from internal flags such as account status, staff identifiers, and activation state
- expose stable IDs that other domains can reference

## Process Flow

1. A customer or pending staff user record plus one profile record is created during enrollment or admin provisioning.
2. Auth completes Google verification and email OTP before the pending identity should be treated as fully active.
3. Profile fields can be updated later through the users module without moving token or OTP ownership into this domain.
4. Addresses can be added and updated per user.
5. When an address is marked default, previous default addresses for that user are cleared.
6. Downstream domains use the stable user ID, role, account-state fields, and optional `staff_code` snapshot fields when they need operational ownership context.

## Use Cases

- auth enrollment provisions a pending customer identity before activation completes
- auth-admin staff provisioning creates technician, service adviser, and super-admin identities in pending activation state in this domain
- customer or staff reads a user by id
- customer updates a profile
- customer manages saved addresses
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
- duplicate `staff_code` across staff identities
- pending identities activated twice or treated as active before auth completes verification
- updating a missing user returns not found
- updating an address that does not belong to the user returns not found
- assigning a new default address must clear previous defaults for that user
- public user endpoints must not allow role escalation or direct activation-state changes

## Writable Sections

- user identity fields, profile rules, saved-address semantics, user-facing vs internal flags, and user APIs
- do not edit password, token, or session logic here

## Out of Scope

- password and session logic
- Google identity linkage and email OTP challenge ownership
- vehicle ownership transfer rules
- order snapshot address ownership
- user preference storage beyond current implemented fields
