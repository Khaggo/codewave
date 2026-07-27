# AUTOCARE Playwright QA Harness

This suite is a cross-surface QA harness for the seeded booking-to-job-order flow. It is designed to behave more like a full operational audit than a narrow happy-path test.

## Coverage

- Customer mobile sign-in and booking submission through the Expo web surface
- Reservation fee gate verification before adviser follow-through
- Service adviser booking confirmation and workshop handoff
- Job order creation and technician assignment
- Technician progress + evidence upload
- Head technician QA verdict without super-admin credentials
- Adviser finalization, manual payment recording, and invoice verification
- Customer completion-history assertion only after service + billing finish
- Role-gating and basic UX validation on staff web

## Prerequisites

Run these locally before `npm run qa:e2e`:

```powershell
cd D:\mainprojects\codewave
npm run dev:main
```

```powershell
cd D:\mainprojects\codewave
npm run dev:web
```

```powershell
cd D:\mainprojects\codewave
npm run dev:mobile:web
```

These repo-root runtime scripts now go through a single-instance watchdog. If the expected port is already occupied, the watchdog refuses to spawn a duplicate Node or Expo process.

If `mobile/.runtime/qa-mobile-web-export/index.html` already exists, the harness will auto-serve that static export on `http://127.0.0.1:8095` and use it instead of requiring a live Expo web server.

## Important local assumptions

- `mobile/.env.local` must point `EXPO_PUBLIC_API_BASE_URL` at the currently valid backend host.
- The seeded QA accounts from `backend/scripts/seed-booking-job-order-qa-accounts.ts` must already exist.
- PayMongo is treated as a fragile local dependency. The suite covers the reservation-fee gate and supports manual-counter confirmation on staff web so the booking can still move through the operational flow in local QA.
- If you want to refresh the static mobile fallback, run `cd mobile && npx expo export --platform web --output-dir .runtime/qa-mobile-web-export`.
- The Playwright mobile-web surrogate proxies absolute mobile API calls to the configured local backend so browser CORS does not mask the native Expo booking flow.

## Run

```powershell
cd D:\mainprojects\codewave
npm install
npm run qa:e2e
```

Headed mode:

```powershell
npm run qa:e2e:headed
```

Open the HTML report:

```powershell
npm run qa:e2e:report
```

## Output

Artifacts are written to `qa/playwright/artifacts/`:

- `html-report/`
- `results.json`
- `qa-summary.md`

The structured markdown report is intended to answer:

- what passed
- what failed
- what needs fixing
- severity of each failed test
