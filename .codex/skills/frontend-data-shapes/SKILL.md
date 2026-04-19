---
name: frontend-data-shapes
description: Use when changing request, response, session, store, or screen data shapes in the web or mobile clients for this repo. This skill is for keeping frontend state, API client mapping, and UI-facing derived fields aligned without leaking raw backend payloads throughout React components.
---

# Frontend Data Shapes

## Overview

Use this skill when the problem is not "how do we fetch it" but "what shape should the client use."
It is meant for request payloads, response normalization, auth/session objects, booking models, onboarding drafts, and any UI-specific adapter layer in `frontend/` or `mobile/`.

## Shape Ownership

- Backend transport shapes belong to API clients and adapters.
- UI state shapes belong to screens, stores, and contexts.
- Derived display values belong in helpers or client normalizers, not in raw API payloads.

## Primary Files

- Web auth/session shape: `frontend/src/lib/authClient.js`, `frontend/src/lib/userContext.js`, `frontend/src/lib/userContext.jsx`
- Web booking/admin shape: `frontend/src/lib/bookingStaffClient.js`, `frontend/src/lib/api/generated/**`
- Mobile auth/onboarding shape: `mobile/src/lib/authClient.js`
- Mobile booking shape: `mobile/src/lib/bookingDiscoveryClient.js`
- Shared helpers: `frontend/src/shared/autocare/**`, `mobile/src/shared/autocare/**`

## Workflow

### 1. Find the authoritative incoming shape

- Read the backend DTO/controller response or generated client type first.
- Identify which fields are transport fields and which are only needed for presentation.

### 2. Normalize at the boundary

- Convert raw payloads inside `src/lib/**` or a nearby helper.
- Keep components consuming stable view models rather than raw response objects.
- Reuse one normalizer per shape instead of repeated inline object mapping.

### 3. Separate raw and derived fields

- Raw examples: `id`, `email`, `role`, `staffCode`, `birthday`, `timeSlotId`
- Derived examples: `roleLabel`, `initials`, `vehicleDisplayName`, formatted clock labels

Derived fields can be computed client-side, but they should not redefine the transport contract.

### 4. Keep session shapes stable

- Web staff auth currently normalizes session objects inside `frontend/src/lib/authClient.js`.
- Mobile customer auth and onboarding currently normalize account/session objects inside `mobile/src/lib/authClient.js`.
- If you change auth/session shape, update both the normalizer and the consuming context/store code in the same pass.

### 5. Verify with live data

- Build web if you touched `frontend/`.
- Export mobile if you touched `mobile/`.
- Run the relevant real flow when the shape impacts auth, onboarding, or bookings.

## Good Patterns

- Keep `fetch`/request helpers responsible for parsing and error wrapping.
- Use one adapter to bridge backend shape to UI shape.
- Preserve nullability intentionally instead of silently converting everything to empty strings.
- Keep date-only formatting helpers centralized.

## Red Flags

- Screens importing backend response assumptions directly.
- Two components interpreting the same field differently.
- Session shape duplicated in multiple contexts with drift.
- A generated shape exists, but the handwritten client silently diverges from it.

