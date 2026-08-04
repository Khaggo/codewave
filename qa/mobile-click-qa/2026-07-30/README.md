# Mobile Click-by-Click QA

QA began on 2026-07-30 and was completed on 2026-08-01 using Expo Go on
`emulator-5554` (1080 x 2400), the local backend on port `3000`, and Metro on
port `8081`.

## Result

The primary customer MVP paths are usable. Authentication, restored sessions,
Home, Garage, Booking, Insurance, More, Rewards, and Add Vehicle validation were
exercised through the rendered Android UI. Two mobile blockers discovered during
the run were fixed and retested.

## Clicked Journeys

| Journey | Result | Notes |
| --- | --- | --- |
| Customer sign-in and session restore | Pass | Session survived force-stop and relaunch. |
| Home | Pass | Booking state, notifications, vehicle shortcut, and five-tab navigation rendered. |
| Garage | Pass | Vehicle search, bounded `1-3 of 191` paging, selection, summary, and quick actions rendered. |
| Booking | Pass | Vehicle, service, available date, slot, review, submit, and reservation-payment handoff completed. |
| Insurance request | Pass | Three stages, validation, document picker, OR/CR attachment, submit, status, and document receipt completed. |
| Insurance recovery | Pass | Submitted request and document state were recovered from the server after relaunch. |
| More | Pass | Rewards, settings, notification preferences, and sign-out remained discoverable. |
| Rewards | Pass | Balance, tier progress, `1-6 of 15` paging, and claim controls rendered; no reward was redeemed. |
| Add Vehicle validation | Pass after fix | Empty submit is blocked with readable field errors; Cancel creates no vehicle. |
| External reservation payment | Not exercised | PayMongo/external payment completion was outside this local run. |

## Fixes Applied

1. Detached inactive Dashboard tabs in `mobile/App.js`. The hidden Dashboard
   navigation layer had intercepted taps on the focused Insurance stack footer.
2. Kept the selected Insurance tab and vehicle in navigation parameters when
   moving among Home, Request, Documents, and Status.
3. Removed React Native `cache: 'no-store'` behavior from Insurance requests that
   introduced an unsupported `_` query parameter.
4. Added stable same-account vehicle snapshot handling so a transient empty
   refresh does not clear Insurance state. Incoming arrays retain reference
   identity, preventing a React maximum-update-depth loop.
5. Preserved app-private DocumentPicker cache URIs in draft recovery while still
   stripping unsafe or external file paths.
6. Replaced the nonexistent `colors.error` token with `colors.danger` in Garage
   modal validation styles. Error borders and messages are now visible on dark
   surfaces.

## Automated Verification

- Insurance/Garage focused Node tests: **26 passed, 0 failed**.
- Android Expo production export: **passed** in 59.6 seconds.
- Export bundle: 1,138 modules; Hermes bundle 3.79 MB.
- Export output: `mobile/.runtime/mobile-click-qa-export-20260801`.
- Focused `git diff --check`: passed; only line-ending warnings were reported.
- No new maximum-update-depth errors appeared after the final identity fix. Old
  logcat entries from the reproduced failure remain in the device history.

## Evidence

Key screenshots in this directory:

- `mobile-after-login.png`
- `mobile-garage-summary.png`
- `mobile-booking-result.png`
- `mobile-footer-fix-stage2.png`
- `cache-persist-proof.png`
- `submit-immediate.png`
- `insurance-status-success.png`
- `insurance-documents-success.png`
- `insurance-server-recovered.png`
- `more-home.png`
- `rewards2.png`
- `add-vehicle-validation-fixed.png`

Raw intermediate screenshots, UI hierarchy dumps, and emulator logs are kept in
the local ignored runtime archive instead of the reviewable evidence set.

## Remaining Findings

- The QA fixture account has 191 vehicles and 247 unread notifications. This is
  useful for paging checks but makes normal customer review noisy.
- Garage initially renders three vehicle choices from a 191-record account; the
  bounded behavior is performant, but the selected-card row can look clipped on
  the right edge.
- Home labels its vehicle feature generically as `Owned vehicle` even when a real
  selected vehicle is available.
- Expo Go sometimes remains on its update splash when opened through
  `10.0.2.2:8081`. `127.0.0.1:8081` through `adb reverse` is reliable.
- Heavy UI hierarchy dumps can pressure the 2 GB emulator. Screenshots and
  targeted dumps were used instead of leaving unbounded automation attached.
- The root runtime-manager caller can still time out without output even when a
  service becomes healthy. That tooling issue is separate from the verified app
  flows and should remain a dedicated runtime-management task.
