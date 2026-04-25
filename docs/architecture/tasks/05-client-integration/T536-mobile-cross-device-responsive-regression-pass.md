# Mobile Cross Device Responsive Regression Pass

## Task ID

`T536`

## Title

Verify and harden mobile layouts across small, baseline, and large phone widths.

## Type

`client-integration`

## Status

`done`

## Priority

`medium`

## Owner Role

`validator`

## Source of Truth

- `../../frontend-backend-sync.md`
- `../../../team-flow-customer-mobile-lifecycle.md`
- `T502-customer-booking-discovery-mobile-flow.md`
- `T503-customer-booking-create-and-history-mobile-flow.md`
- `T524-catalog-and-product-discovery-mobile-flow.md`
- `T526-order-history-and-invoice-tracking-mobile-flow.md`

## Depends On

- `T531`
- `T524`
- `T526`

## Goal

Make the mobile customer app stable across different phone sizes so service discovery, booking dates, booking cards, store cards, order history, and bottom navigation do not shift or overflow when the user tests on another device.

## Deliverables

- responsive audit of `mobile/src/screens/Dashboard.js`
- responsive audit of shared mobile components used by booking, store, insurance, and profile surfaces
- fixes for text overflow, card width drift, bottom-nav spacing, and compact phone wrapping
- representative screenshots or notes for small, baseline, and large phone widths

## Completion Notes

- Hardened the mobile dashboard container spacing so narrow phones use reduced horizontal padding without changing customer workflows.
- Replaced brittle booking-date fixed widths with flex-basis card sizing for single-column tiny phones, two-column compact phones, and three-column larger phones.
- Tightened booking service, vehicle, date, cart, order, checkout, and home dashboard cards with `minWidth: 0`, wrapping, compact variants, and non-shrinking icons/actions where needed.
- Updated the shared date picker to use modal max-width, compact overlay padding, wrapped step chips, and flex-basis year/month options instead of fixed percentage widths.
- Updated the shop catalog section so compact headers wrap cleanly and larger phones can show product cards in a stable two-column grid.

## Representative Width Notes

- Small phones under `360px`: booking date cards stack full-width, quick actions become a two-column grid, bottom-nav insets shrink, and cart quantity controls wrap below item copy.
- Baseline phones around `390px`: service cards, slot definitions, booking date cards, order cards, and checkout rows keep two-column or wrapped layouts without horizontal scrolling.
- Larger phones at `430px+`: shop catalog cards can use a two-column grid while booking availability uses three stable date-card columns.

## Implementation Notes

- keep current workflows intact; this is layout hardening, not a product rewrite
- prefer container-driven spacing and stacked compact variants over brittle percentage widths
- preserve Expo Go behavior for real-device testing
- use Expo web only when the user explicitly wants browser-mode layout checks, and apply `port-aware-dev-runtime` first

## Acceptance Checks

- mobile booking service selection remains usable on small and large phones
- availability/date selection does not overflow or jump between device widths
- store and order cards remain readable without horizontal scrolling
- bottom navigation labels and icons stay tappable and aligned
- no duplicate Expo, backend, or web Node process is created during validation

## Validation Evidence

- `cd D:\mainprojects\codewave\mobile && npx expo export --platform android --output-dir .runtime/export-t536-responsive` passed.
- Port guard was checked first; existing listeners on `3000`, `3002`, and `8081` were reused and no new long-running backend, web, or Expo server was started.

## Out of Scope

- visual redesign of the full mobile app
- native upload or camera features
- changing backend booking or ecommerce contracts
