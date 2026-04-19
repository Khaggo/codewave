# AUTOCARE Team Flow Diagram Production Review

Date: 2026-04-18  
Basis: Hybrid review against the current repo-backed architecture, canonical docs, and intended production target

## High-Level Verdict

The diagram is a good cross-domain overview, but it is **not production-safe as drawn**. It mixes customer flows, staff flows, operational state changes, AI assistance, and back-office status updates in one continuous path without clearly separating:

- channel responsibility (`mobile` vs `web`)
- domain ownership (`main-service` vs `ecommerce-service`)
- synchronous user actions vs asynchronous/event-driven processing
- advisory AI outputs vs human-approved release decisions

As a concept map it is useful. As a production system flow it currently has several critical sequencing and ownership issues that should be corrected before it is used as a source of truth.

## Ranked Findings

### Critical Issues

1. **Customer onboarding flow is sequenced incorrectly for production identity handling.**
   The diagram goes from `Registration Screen -> Enter Vehicle Details -> Trigger 2FA -> Registration Complete -> Service Booking`. In the repo and canonical auth policy, account creation must explicitly model `pending_activation`, OTP verification, and session issuance before the user is treated as fully active. Vehicle capture can be collected early, but persistence should happen only after activation succeeds.

2. **Staff/admin flow is missing the actual staff provisioning and activation lifecycle.**
   The web branch starts at `Admin Login`, but production RBAC requires super-admin provisioning of staff accounts and pending activation before those staff identities become usable. The current diagram skips that identity-ownership step entirely.

3. **The QA lane gives AI too much implied authority.**
   `Gate 1: SBERT Similarity` appears to sit at the center of the QA audit flow, but canonical policy says AI is advisory only. Human staff remain the final authority for release, QA override, and customer-visible publication.

4. **Cross-domain side effects are modeled as direct inline flow instead of domain events/jobs.**
   `Unified Timeline Update`, `Customer Notified`, `Fulfillment Alert`, loyalty effects, and QA/customer badge outputs should not all be treated as synchronous inline transitions. Production architecture expects RabbitMQ events and BullMQ jobs for those side effects.

5. **E-commerce ordering is under-modeled for transactional safety.**
   The flow goes `Place Order -> Stock Check -> Deduct Stock -> Order Placed`, but a production commerce flow needs reservation/atomicity semantics, not a loose check-then-deduct sequence. Otherwise race conditions will oversell stock.

### Important Structural Gaps

1. **The diagram does not clearly separate `main-service` and `ecommerce-service`.**
   Insurance, bookings, QA, loyalty, and vehicle timeline belong to `main-service`, while catalog, inventory, cart, orders, and invoice-payments belong to `ecommerce-service`.

2. **Notifications are present as outcomes but not as an owning module.**
   OTP, booking reminders, claim updates, and fulfillment alerts all imply a notification service, but the diagram treats them as end nodes rather than domain-triggered notifications owned by `main-service.notifications`.

3. **Booking flow lacks cancellation, reschedule, and concurrency handling.**
   The diagram only shows `Slot Available?` and `Booking Confirmed`, but production booking needs slot locking, expiry, duplicate-request handling, and user-visible retry/rebook paths.

4. **Vehicle timeline is treated as a simple direct update instead of a derived read model.**
   In the architecture, lifecycle/timeline behavior depends on multiple domains and should be rebuilt from facts, not manually pushed as an isolated step.

5. **Loyalty is too tightly coupled to QA/customer-badge behavior.**
   `QA Badge & Summary -> Customer Sees QA Badge` is reasonable, but tying that visually into loyalty dashboard behavior risks implying that QA publication and loyalty accounting are the same module or transaction.

### Lower-Priority Clarity Issues

1. The black box labeled `3` is unexplained and should be removed or labeled.
2. `Risk Points` and `Gate 2 - Risk Points` are ambiguous. It is unclear whether they are fraud/risk scoring, QA scoring, or loyalty/rating logic.
3. `Access Level Set` and `Validate Access Level` appear redundant unless one is authentication and the other is RBAC state assignment.
4. `Claim Pending`, `Claim Quoted`, and `Claim Issued` are modeled like terminal branches, but they are really state values inside one insurance record lifecycle.

## Module-by-Module Validation

### 1. Customer Onboarding and Access

**Diagram path reviewed**
- `Mobile App Entry`
- `Registration Screen`
- `Enter Vehicle Details`
- `Trigger 2FA`
- `2FA Success?`
- `Registration Complete`

**Validation**
- Good intent: customer onboarding is correctly placed on the mobile channel.
- Issue: the flow treats 2FA as a single opaque step. Production auth should distinguish identity proof, OTP verification, and account activation state.
- Issue: the flow does not show `pending_activation`.
- Issue: `Registration Complete` immediately leading into booking is acceptable only after a valid session exists.
- Issue: vehicle details being entered before activation is fine as temporary form data, but not as committed customer-owned records until the account is active.

**Recommended correction**
- Split onboarding into:
  - account registration request
  - pending activation
  - OTP verification
  - account activation + token issuance
  - post-activation customer onboarding persistence
  - optional first-booking entry

### 2. Admin/Staff Access and Admin Controls

**Diagram path reviewed**
- `Web Portal Entry`
- `Admin Login`
- `Validate Access Level`
- `Show Dashboard`
- `Admin Configures Tiers`
- `Monitor Redemption Trends`
- `Rewards Configured`

**Validation**
- Good intent: web is correctly positioned as the staff/admin channel.
- Issue: staff provisioning and activation are absent.
- Issue: `Admin Configures Tiers` should be super-admin or explicitly privileged staff only, not a generic dashboard action.
- Issue: access validation should be modeled as both authentication and RBAC authorization, not just one generic check.

**Recommended correction**
- Split web identity flow into:
  - staff login
  - role/permission validation
  - route-level access guard
  - privileged admin actions such as staff provisioning and loyalty configuration

### 3. Booking and Schedule Orchestration

**Diagram path reviewed**
- `Service Booking`
- `Select Service Type`
- `Choose Date and Time`
- `Slot Available?`
- `Booking Confirmed`
- `Slot Unavailable`

**Validation**
- Good intent: the customer booking path is straightforward.
- Issue: slot checking needs explicit locking or transactional reservation.
- Issue: `Slot Unavailable` is treated as an end node, but production requires recovery actions such as alternate slots, waitlist, or retry.
- Issue: no cancel/reschedule path is shown.

**Recommended correction**
- Model booking as:
  - service selection
  - time-slot query
  - provisional slot hold
  - booking create/confirm
  - notification side effects
  - optional reschedule/cancel branch

### 4. Vehicle Timeline and Operational Visibility

**Diagram path reviewed**
- `Unified Timeline Update`
- `View Timeline`

**Validation**
- Good intent: the diagram recognizes a unified customer/service history.
- Issue: the timeline is shown as a simple direct step after booking, but production lifecycle/timeline depends on multiple upstream facts from bookings, inspections, job orders, back jobs, QA, insurance, and possibly commerce.
- Issue: no rebuild/retry path is shown if timeline derivation fails.

**Recommended correction**
- Treat timeline as a derived read model owned by `main-service.vehicle-lifecycle`.
- Upstream operational domains should publish events/facts; lifecycle rebuild should occur asynchronously.

### 5. Job Order Management

**Diagram path reviewed**
- `Calendar View`
- `Appointment Appears`
- `Convert to Job Order`
- `Job Order Active`
- `Job Order Closed`

**Validation**
- Good intent: booking-to-job-order conversion is correctly represented.
- Issue: there is no technician assignment step.
- Issue: there is no explicit work-progress or evidence submission step in the main job-order lane.
- Issue: `Job Order Closed` appears to happen independently of QA review, invoice readiness, or release checks.

**Recommended correction**
- Expand the production flow to include:
  - adviser review of booking
  - convert booking to job order
  - assign technician
  - update progress/evidence
  - finalize work
  - QA/release gate
  - close job order

### 6. QA Audit and AI-Assisted Review

**Diagram path reviewed**
- `Technician Logs Diagnosis`
- `Upload Photo Evidence`
- `AI Layman Summary`
- `Gate 1: SBERT Similarity`
- `QA Flags Resolved`
- `QA Badge & Summary`
- `Customer Sees QA Badge`

**Validation**
- Good intent: evidence-backed QA and customer-readable outputs are included.
- Issue: `AI Layman Summary` and `Gate 1: SBERT Similarity` are mixed together even though they serve different purposes.
  - layman summary belongs to customer-facing explanation or lifecycle summary
  - similarity/risk scoring belongs to QA assistance
- Issue: no human reviewer node is shown.
- Issue: no manual override or rejection path is shown.
- Issue: no audit trail or reviewer identity is shown for customer-visible QA outputs.

**Recommended correction**
- Split this into:
  - operational evidence capture
  - AI-assisted QA analysis
  - human reviewer decision
  - optional override/audit
  - customer-visible summary publication

### 7. Insurance Inquiry and Claim Tracking

**Diagram path reviewed**
- `Insurance Inquiry`
- `Auto-Fill Vehicle & Owner`
- `Submit Inquiry Form`
- `Quotation & Claim Tracking`
- `Claim Status Update`
- `Claim Pending / Claim Quoted / Claim Issued`
- `Customer Notified`

**Validation**
- Good intent: reuse of user and vehicle context is appropriate.
- Issue: claim statuses are represented as separate branches instead of a state machine on one insurance inquiry/claim record.
- Issue: missing document upload path, which is part of the backend insurance domain.
- Issue: the diagram may imply direct insurer API integration, but the current canonical architecture explicitly excludes live insurer APIs.
- Issue: customer notification should be a side effect triggered by insurance state changes, not a direct continuation line.

**Recommended correction**
- Use one insurance inquiry/claim lifecycle with explicit statuses and document attachments.
- Make claim notifications an event-driven notification concern.

### 8. E-Commerce and Fulfillment

**Diagram path reviewed**
- `E-commerce Shop`
- `Browse Catalog`
- `Select Product`
- `Place Order`
- `Stock Check`
- `Stock Available / Stock Low`
- `Deduct Stock`
- `Order Placed`
- `Fulfillment Alert`
- `Order Fulfilled`
- `Restock Highlighted`

**Validation**
- Good intent: stock-sensitive order flow is represented.
- Issue: cart, checkout preview, invoice creation, and payment/invoice tracking are not shown.
- Issue: `Stock Check -> Deduct Stock` is too weak for a production inventory model.
- Issue: `Restock Highlighted` is an internal inventory/admin concern, not the direct end of a failed customer order path.
- Issue: fulfillment should be downstream of a valid created order record, not simply a direct continuation from deduction.

**Recommended correction**
- Separate into:
  - browse/catalog/cart
  - checkout/order creation
  - stock reservation/deduction
  - invoice/payment tracking
  - fulfillment workflow
  - admin inventory alerting

### 9. Loyalty and Redemption

**Diagram path reviewed**
- `Loyalty Dashboard`
- `View Points Balance`
- `Redeem Points`
- `Points Sufficient?`
- `Apply Discount`
- `Points Redeemed`
- `Points Insufficient`

**Validation**
- Good intent: customer-visible redemption path is straightforward.
- Issue: loyalty earning is not shown, only redemption.
- Issue: `Apply Discount` should happen in a transactional purchase or service-invoice context, not as an isolated dashboard action.
- Issue: missing reward catalog or reward selection behavior.
- Issue: loyalty depends on paid service facts and admin-configured earning rules, but those dependencies are not visible.

**Recommended correction**
- Model loyalty as:
  - points ledger accumulation from qualifying facts
  - reward catalog / available rewards
  - redemption intent
  - sufficiency check
  - discount/reward application in a qualifying transaction

## Suggested Modularized Structure

The flow should be reorganized into five clear layers.

### 1. Channel Layer

- **Mobile customer app**
  - registration
  - login
  - booking
  - insurance inquiry
  - timeline
  - loyalty
  - e-commerce customer actions
- **Web staff/admin portal**
  - staff login
  - dashboard
  - bookings/calendar
  - job order handling
  - QA review
  - loyalty/reward administration
  - inventory/admin alerts

### 2. Domain Command Layer

- `main-service.auth`
- `main-service.users`
- `main-service.vehicles`
- `main-service.bookings`
- `main-service.job-orders`
- `main-service.quality-gates`
- `main-service.insurance`
- `main-service.vehicle-lifecycle`
- `main-service.loyalty`
- `ecommerce.catalog`
- `ecommerce.cart`
- `ecommerce.orders`
- `ecommerce.inventory`
- `ecommerce.invoice-payments`

### 3. Event and Job Orchestration Layer

- RabbitMQ events for:
  - booking confirmed
  - job order finalized
  - QA blocked/overridden
  - order created
  - invoice/payment recorded
  - loyalty points earned
- BullMQ jobs for:
  - OTP delivery retries
  - reminder retries
  - timeline rebuild
  - AI summary/QA jobs
  - analytics refresh

### 4. Notification Layer

- booking confirmations/reminders
- claim updates
- fulfillment alerts
- OTP delivery
- loyalty and reward notices

### 5. Review and Audit Layer

- staff provisioning and activation audit
- manual QA review and override audit
- customer-visible AI publication review
- sensitive state-transition audit trails

## Major-Node Input and Dependency Matrix

### 1. Customer Onboarding and Access

**Required inputs**
- email - `User input`
- password or Google identity token, depending on enrollment mode - `User input / External service`
- first name, last name, phone - `User input`
- OTP code - `User input`

**Derived or enriched inputs**
- OTP challenge record - `System-generated`
- pending account ID and activation state - `System-generated`
- risk score / rate-limit counters - `System-generated`
- verified Google identity result - `External service/API`

**Gated inputs / prerequisites**
- unique email
- valid pending account
- non-expired OTP
- risk policy not exceeded

**Upstream dependencies**
- `main-service.auth`
- `main-service.users`
- `main-service.notifications`

### 2. Admin/Staff Access and Admin Controls

**Required inputs**
- staff email and password - `User input`
- role-protected admin action request - `User input`

**Derived or enriched inputs**
- authenticated staff identity - `System-generated`
- staff role and status - `System-generated`
- audit log record - `System-generated`

**Gated inputs / prerequisites**
- active staff account
- correct role (`service_adviser` or `super_admin`, depending on action)

**Upstream dependencies**
- `main-service.auth`
- `main-service.users`
- RBAC guards/policies

### 3. Booking and Schedule Orchestration

**Required inputs**
- customer identity - `System-generated`
- selected service type - `User input`
- selected date/time - `User input`
- vehicle reference - `User input / System-generated`

**Derived or enriched inputs**
- slot availability result - `System-generated`
- provisional hold or schedule lock - `System-generated`
- booking ID and status - `System-generated`

**Gated inputs / prerequisites**
- activated customer account
- owned vehicle exists
- selected slot remains available at commit time

**Upstream dependencies**
- `main-service.users`
- `main-service.vehicles`
- `main-service.bookings`
- `main-service.notifications`

### 4. Vehicle Timeline and Operational Visibility

**Required inputs**
- vehicle ID - `User input / System-generated`
- authorized viewer identity - `System-generated`

**Derived or enriched inputs**
- booking facts - `System-generated`
- inspection facts - `System-generated`
- job-order facts - `System-generated`
- QA/release facts - `System-generated`
- insurance facts - `System-generated`
- optional loyalty facts derived from paid service history - `System-generated`

**Gated inputs / prerequisites**
- viewer owns the vehicle or has staff permission
- upstream events/facts have been processed

**Upstream dependencies**
- `main-service.vehicle-lifecycle`
- bookings, inspections, job orders, back jobs, quality gates, insurance

### 5. Job Order Management

**Required inputs**
- confirmed booking / appointment reference - `System-generated`
- assigned adviser/technician - `System-generated / User input`
- work instructions or diagnosis notes - `User input`

**Derived or enriched inputs**
- job-order ID/status - `System-generated`
- assignment metadata - `System-generated`
- progress records - `System-generated`
- invoice readiness state - `System-generated`

**Gated inputs / prerequisites**
- booking exists
- staff user has correct role
- technician is assigned or otherwise authorized

**Upstream dependencies**
- `main-service.bookings`
- `main-service.job-orders`
- `main-service.users`

### 6. QA Audit and AI-Assisted Review

**Required inputs**
- diagnosis notes - `User input`
- photo evidence - `User input`
- completed or near-complete job-order context - `System-generated`

**Derived or enriched inputs**
- AI similarity/risk annotations - `System-generated / External service/API if enabled`
- layman summary draft - `System-generated / External service/API if enabled`
- reviewer decision - `User input`
- override/audit record - `System-generated`

**Gated inputs / prerequisites**
- job order has sufficient evidence
- AI provider available if AI assistance is enabled
- human reviewer decision required for final publish/release

**Upstream dependencies**
- `main-service.job-orders`
- `main-service.quality-gates`
- `main-service.vehicle-lifecycle`
- AI provider adapter

### 7. Insurance Inquiry and Claim Tracking

**Required inputs**
- customer identity - `System-generated`
- vehicle reference - `User input / System-generated`
- inquiry details and attachments - `User input`

**Derived or enriched inputs**
- owner/vehicle auto-fill - `System-generated`
- insurance inquiry ID - `System-generated`
- claim status - `System-generated`
- notification payload - `System-generated`

**Gated inputs / prerequisites**
- authenticated customer
- owned vehicle exists
- required claim/inquiry fields complete

**Upstream dependencies**
- `main-service.users`
- `main-service.vehicles`
- `main-service.insurance`
- `main-service.notifications`

### 8. E-Commerce and Fulfillment

**Required inputs**
- customer identity - `System-generated`
- product selection - `User input`
- quantity - `User input`
- shipping/contact details if applicable - `User input`

**Derived or enriched inputs**
- product snapshot - `System-generated`
- stock/reservation state - `System-generated`
- order ID - `System-generated`
- invoice/payment record - `System-generated`
- fulfillment state - `System-generated`

**Gated inputs / prerequisites**
- product exists
- sufficient stock or valid reservation
- successful order creation

**Upstream dependencies**
- `ecommerce.catalog`
- `ecommerce.inventory`
- `ecommerce.cart`
- `ecommerce.orders`
- `ecommerce.invoice-payments`
- `main-service.notifications` for alerts if needed

### 9. Loyalty and Redemption

**Required inputs**
- customer identity - `System-generated`
- selected reward or redemption intent - `User input`

**Derived or enriched inputs**
- current points balance - `System-generated`
- ledger transactions - `System-generated`
- reward availability - `System-generated`
- discount application record - `System-generated`

**Gated inputs / prerequisites**
- active loyalty account
- qualifying points balance
- valid reward or discount target transaction

**Upstream dependencies**
- `main-service.loyalty`
- `main-service.users`
- finalized service invoice facts and/or commerce events

## Missing Production Considerations

### Error Handling and Edge Cases

- duplicate registration attempts
- expired/invalid/already-used OTP
- repeated OTP resend abuse
- login on pending/deactivated accounts
- slot taken between browse and confirm
- duplicate booking submissions
- technician upload failures for required evidence
- AI provider timeout or unavailable state
- claim status changed without successful customer notification
- stock changes between browse and order placement
- partial order creation with failed stock deduction
- reward redeemed twice or redeemed against invalid balance

### Dependencies Between Modules

- bookings depend on users and vehicles
- job orders depend on bookings and staff identity
- QA depends on job-order evidence and human review
- timeline depends on multiple upstream operational domains
- loyalty depends on finalized service/commercial facts
- insurance depends on user and vehicle ownership
- notifications depend on stable domain facts, not ad hoc UI flows
- ecommerce and loyalty should communicate through events, not shared direct state assumptions

### Real-World Scenarios Not Covered

- staff account provisioning and pending activation
- appointment rescheduling and cancellation
- no-show or late-arrival handling
- back-job creation after prior service
- invoice generation and payment tracking before loyalty earning
- manual QA override by `super_admin`
- customer dispute on insurance or service status
- inventory reservation expiry and restock workflow
- notification delivery failure and retry visibility
- timeline rebuild after missed or delayed events

## Recommended Documentation Use

Use the current diagram as a **capability map**, not as the final production source of truth. For documentation-grade production use, convert it into:

1. **channel-level flows**
   - customer mobile
   - staff/admin web
2. **domain-owned lifecycle diagrams**
   - bookings
   - job orders
   - QA/release
   - insurance
   - ecommerce
   - loyalty
3. **cross-cutting orchestration diagrams**
   - notifications
   - events/jobs
   - AI review and audit

That split will make the design easier to validate, easier to implement, and much safer to maintain over time.
