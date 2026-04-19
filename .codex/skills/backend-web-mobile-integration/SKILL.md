---
name: backend-web-mobile-integration
description: Use when integrating backend changes into the web and mobile apps in this repo, especially for auth, bookings, onboarding, profile, vehicle, or admin/staff flows. This skill is for tracing an endpoint or contract across `backend/`, `frontend/`, and `mobile/` while preserving the split that web is staff/admin-only and mobile is customer-only.
---

# Backend Web Mobile Integration

## Overview

Use this skill when a backend change needs to land cleanly across the web and mobile clients.
It is optimized for this repo's current split: `frontend/` is staff/admin-facing, `mobile/` is customer-facing, and `backend/` main service runs on port `3000`.

## Repo Ground Rules

- Keep web staff/admin-only. Do not add customer self-registration or customer login-only flows to `frontend/`.
- Keep mobile customer-only. Registration, OTP verification, profile birthday save, first vehicle save, customer login, and customer booking flows belong in `mobile/`.
- Treat `.env` files as source-of-truth for base URLs.
- Prefer fixing API shape mismatches in client boundary files instead of scattering mapping logic across screens.

## Integration Map

- Backend API: `backend/apps/main-service/src/modules/**`
- Backend contracts/events: `backend/shared/events/contracts/**`
- Web client boundaries: `frontend/src/lib/authClient.js`, `frontend/src/lib/bookingStaffClient.js`, `frontend/src/lib/userContext.js`, `frontend/src/lib/userContext.jsx`
- Web routes/screens: `frontend/src/app/**`, `frontend/src/screens/**`
- Web generated client shapes: `frontend/src/lib/api/generated/**`
- Mobile client boundaries: `mobile/src/lib/authClient.js`, `mobile/src/lib/bookingDiscoveryClient.js`
- Mobile flows/screens: `mobile/App.js`, `mobile/src/screens/**`
- Vendored shared package: `frontend/src/shared/autocare/**`, `mobile/src/shared/autocare/**`

## Workflow

### 1. Trace the change from contract to surface

- Start at the backend controller, DTO, or repository that owns the changed behavior.
- Identify which surface consumes it:
  - Web staff/admin operations such as login, schedule, queue, catalog, inventory, summaries, QA audit, settings
  - Mobile customer operations such as register, OTP verify, onboarding, profile, vehicles, booking discovery, booking create, booking history
- Confirm whether the change is a new endpoint, a shape change, or a behavioral change on an existing endpoint.

### 2. Update the right client boundary

- For web staff auth/session work, update `frontend/src/lib/authClient.js` and `frontend/src/lib/userContext.js` or `.jsx`.
- For web booking operations, update `frontend/src/lib/bookingStaffClient.js`.
- For mobile auth/onboarding, update `mobile/src/lib/authClient.js`.
- For mobile booking discovery/history/detail, update `mobile/src/lib/bookingDiscoveryClient.js`.
- If the change affects generated contract files, update the generator output or align the handwritten client to the generated shape.

### 3. Normalize once, close to the API

- Convert raw backend payloads into UI-safe shapes inside lib/helper files.
- Keep derived display fields like `roleLabel`, `initials`, `vehicleDisplayName`, and formatted labels out of transport payloads.
- Avoid repeating request/response reshaping in React screens.

### 4. Preserve current product boundaries

- Web login remains staff/admin only.
- Web customer registration remains unavailable.
- Mobile registration includes customer info and vehicle info.
- Mobile onboarding remains:
  1. register
  2. verify OTP
  3. save birthday
  4. save first vehicle
  5. login again with email/password after activation

### 5. Verify the full path

Run the narrowest useful checks for the surfaces you touched.

```powershell
cd backend
docker compose up -d
npm run db:push
npm run dev:main
```

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/health' -UseBasicParsing
```

```powershell
cd frontend
npm run build
```

```powershell
cd mobile
npx expo export --platform android --output-dir dist-import-check
```

## High-Value Checks

- Staff web login still rejects non-staff roles.
- Mobile register -> OTP -> onboarding -> login still works for customers.
- Booking endpoints stay split correctly:
  - Mobile uses customer booking discovery/create/history/detail
  - Web uses daily schedule, queue, status update, and reschedule operations
- Base URLs still point to the intended backend host for each surface.

