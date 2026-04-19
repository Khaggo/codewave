---
name: frontend-testing-workflow
description: Use when validating changes in the Next.js web app, the Expo mobile app, or the vendored shared frontend package in this repo. This skill is for choosing the right frontend verification mix across build checks, shared Jest tests, and manual flow checks instead of guessing.
---

# Frontend Testing Workflow

## Overview

Use this skill when a change touches `frontend/`, `mobile/`, or the vendored shared package under `src/shared/autocare/`.
This repo does not have one unified frontend test runner, so verification usually means picking the right combination of build checks, export checks, shared-package tests, and manual flow coverage.

## Pick the Smallest Useful Test Surface

### Web app changes

Use this when routes, layouts, staff auth, admin screens, or client-side web logic changed.

```powershell
cd frontend
npm run build
```

Run `npm run lint` if the change is mostly React/Next code hygiene and you want a fast extra pass.

### Mobile app changes

Use this when onboarding, auth, booking, profile, or Expo navigation changed.

```powershell
cd mobile
npx expo export --platform android --output-dir dist-import-check
```

If the user needs a real-device pass, prefer the existing manual onboarding and booking flow instead of inventing a new test path.

### Shared frontend logic changes

Use this when files under `frontend/src/shared/autocare/**` or `mobile/src/shared/autocare/**` changed.

```powershell
cd frontend/src/shared/autocare
npm test
```

```powershell
cd mobile/src/shared/autocare
npm test
```

## Manual Flow Checklist

### Web staff/admin flows

- Staff/admin login works
- Customer accounts are not exposed as web self-registration
- Admin routes still load:
  - `/admin/appointments`
  - `/admin/catalog`
  - `/admin/inventory`
  - `/admin/qa-audit`
  - `/admin/summaries`
  - `/settings`

### Mobile customer flows

- Register a new customer
- Verify OTP
- Save birthday
- Save first vehicle
- Login again with email/password
- Discover services and time slots
- Create a booking
- Open booking history and detail

## When to Add New Tests

- Add or update Jest tests for pure shared logic first.
- For web/mobile UI code without a current test harness, prefer extracting unstable logic into testable helpers rather than forcing brittle component tests into the repo.
- If a bug is contract-related, pair frontend verification with the matching backend tests instead of testing only the UI symptom.

## Red Flags

- A build passes but the base URL points to the wrong host.
- A screen works with mocked local state but fails with real backend data.
- Shared package behavior diverges between `frontend/` and `mobile/`.
- A route renders, but role gating or onboarding sequence is broken.

