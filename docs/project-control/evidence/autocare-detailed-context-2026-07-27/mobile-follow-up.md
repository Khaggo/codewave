# Customer Mobile Follow-Up

## Product Boundary

The Expo mobile app is customer-facing. Staff workflow belongs to the Next.js web portal.

Canonical authentication model:

- mobile: customers;
- staff web: service advisers and super admins;
- technicians: assignment profiles without login.

Any mobile test or source path that admits technician/head-technician workshop sessions is legacy drift.

## Navigation Inventory

Routes identified in `mobile/App.js`:

- Landing
- Register
- Login
- OTP
- Complete Onboarding
- Forgot Password Email
- Forgot Password OTP
- Reset Password
- Menu
- Manage Profile
- Change Password
- Booking
- Vehicle Lifecycle
- Store
- Insurance Inquiry
- Chatbot

## Main Customer Tabs

The large dashboard/orchestrator exposes:

- Home
- Garage
- Book
- Insurance
- Rewards
- Shop

Store includes:

- Catalog
- Orders

## Major Screens

| Concern | Current ownership |
| --- | --- |
| App navigation/session orchestration | `mobile/App.js` |
| Home and major tab orchestration | `mobile/src/screens/Dashboard.js` |
| Vehicle records and service lifecycle | `mobile/src/screens/VehicleLifecycleScreen.js` |
| Insurance inquiry | `mobile/src/screens/InsuranceInquiryScreen.js` |
| Customer booking | Booking screen/module under `mobile/src/screens/` |
| Store/catalog/orders | Dashboard/store feature code and clients |
| Chatbot | `mobile/src/screens/ChatbotScreen.js` |

## API Clients

Identified mobile clients include:

- `authClient`
- `bookingDiscoveryClient`
- `catalogClient`
- `chatbotClient`
- `digitalGarageClient`
- `ecommerceCheckoutClient`
- `insuranceClient`
- `jobOrdersClient`
- `loyaltyClient`
- `notificationClient`
- `vehicleLifecycleClient`
- `mobileSessionAccess`
- `invoiceCheckoutModel`

The mobile app consumes customer views of bookings, garage/vehicle lifecycle, Job Order history/status, invoices/orders, loyalty, insurance, catalog/checkout, chatbot, and notifications. It must not reuse staff claim or QA mutation contracts.

## Session and Local Storage

AsyncStorage is used for:

- persisted/rehydrated authentication/session state;
- remembered insurance inquiry state;
- booking and checkout return state;
- selected lightweight client cache/state.

No robust offline-first synchronization engine, durable mutation queue, merge policy, or conflict-resolution layer was identified. Mobile should therefore be described as online-first with selective local persistence.

## Network and Error Behavior

Current planning assumptions:

- API clients centralize request behavior by domain.
- Some screen-level flows still own loading, error, retry, and cache decisions.
- There is no confirmed global NetInfo-driven offline state machine.
- Customer-visible operations must distinguish server rejection, authentication expiry, connectivity loss, and unknown transport failure.

Required follow-up:

- one shared request/error normalization layer;
- correlation IDs surfaced in support-friendly error states;
- abort/ignore stale requests on screen change;
- idempotency for booking/checkout operations;
- documented retry safety by mutation;
- explicit offline banner and read-only cached-state labeling;
- session refresh behavior verified across app restart.

## Notifications

`notificationClient` exists and the dashboard exposes notification-related UI/state. The customer mobile plan should verify:

- persisted read/unread state from the backend;
- deep links to booking, Job Order/service status, invoice/order, loyalty, and insurance records;
- duplicate notification suppression;
- handling of expired/deleted destinations;
- foreground refresh and app-resume refresh;
- push-token lifecycle if push delivery is enabled;
- no staff-only assignment or claim notification leakage to customers.

## Current Package Baseline

From `mobile/package.json`:

- Expo `~54.0.34`
- React Native `0.81.5`
- React `19.1.0`

Last known repository audit context records unresolved high/moderate transitive advisories around the current Expo dependency tree. That audit was not rerun successfully during this evidence collection, so exact current advisory counts must be refreshed before upgrade planning.

Upgrade policy:

- one Expo SDK at a time;
- run unit tests;
- run Expo Doctor;
- produce Android export;
- produce EAS preview;
- verify login/onboarding, booking, garage, checkout, notifications, and deep links;
- confirm no duplicate React/React Native runtime after workspace consolidation.

## Module Size Risks

| File | Approximate lines |
| --- | ---: |
| `mobile/src/screens/Dashboard.js` | 13,296 |
| `mobile/src/screens/InsuranceInquiryScreen.js` | 2,566 |
| `mobile/App.js` | 1,853 |
| `mobile/src/screens/VehicleLifecycleScreen.js` | 1,457 |

The dashboard currently combines feature rendering, state, requests, navigation, and tab orchestration. This makes unrelated customer features regress together and makes targeted behavioral testing difficult.

## Recommended Feature Boundaries

Keep current routes while extracting:

| Feature | Responsibility |
| --- | --- |
| `features/home` | Customer summary, upcoming service, quick actions. |
| `features/booking` | Discovery, date/time selection, vehicle/service choice, confirmation. |
| `features/garage` | Vehicles, service status, Job Order history, evidence/invoice links. |
| `features/orders` | Store orders, checkout return, invoice/payment presentation. |
| `features/loyalty` | Points, tiers, rewards, redemption. |
| `features/notifications` | Inbox, unread state, deep-link routing. |
| `features/profile` | Profile, password, preferences, logout. |
| `features/insurance` | Inquiry draft, submission, status/history. |
| `features/store` | Catalog, cart, checkout orchestration. |

`Dashboard.js` should become tab navigation plus shallow orchestration. `App.js` should become providers, session gate, and route configuration.

## Role Cleanup

Mobile tests currently include assertions such as:

- app login path admits workshop sessions;
- technician dashboard remains role-aware for technician/head-technician sessions.

These conflict with the canonical boundary. Replace them with:

- customer can authenticate and reach customer routes;
- staff roles are rejected or directed to staff web;
- technician profiles never authenticate;
- staff-only payload fields are not rendered in mobile.

## Verification Snapshot

- Mobile tests: 73 passed.
- Android export: passed, 1,063 modules, approximately 3.74 MB bundle, 36 assets.
- Expo Doctor: unavailable because registry/cache access was not available.
- Metro/Expo development server: not running during collection.
- New mobile screenshots: unavailable during collection.

## Mobile Acceptance Criteria

1. Customer-only role matrix is enforced at session and route boundaries.
2. Existing deep links and routes remain compatible.
3. Dashboard extraction is covered by behavior tests before moving state.
4. Booking and checkout mutations are idempotent and recoverable.
5. Offline state is explicit; cached data is visibly dated and read-only where needed.
6. Notification links survive cold start and authenticated session restoration.
7. Expo Doctor, Android export, EAS preview, and tests pass for each SDK step.
8. Critical customer flows are tested on a physical Android device and at least one iOS target before release.
