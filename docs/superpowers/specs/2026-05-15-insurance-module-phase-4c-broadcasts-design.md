# Insurance Module Phase 4C: Custom In-App Broadcasts

Date: 2026-05-15
Status: Drafted and approved for implementation planning
Scope: Real root system at `C:\Vscode\Main\codewave`

## Summary

Phase 4C adds an insurance-only custom broadcast tool inside the existing web insurance workspace. Staff and admins can compose a fully custom in-app message, target either selected insurance cases or the current filtered insurance queue, and send the message only to eligible active insurance customers.

This phase does not add email, SMS, scheduling, or cross-module campaign targeting. It stays inside the insurance module and reuses the current queue, filtering model, and activity trail so it remains operationally focused instead of becoming a general marketing system.

## Goals

- Let staff send custom insurance-related in-app broadcasts from the existing insurance workspace
- Support both `selected cases` and `filtered results` targeting
- Restrict sending to active, non-terminal insurance cases only
- Deduplicate recipients so one customer receives at most one broadcast per send action
- Keep a staff-visible audit trail inside insurance activity history
- Keep delivery channel limited to `in_app`

## Non-Goals

- Email delivery
- SMS delivery
- Scheduled campaigns
- Automatic repeated broadcasts
- Whole-system customer targeting outside the insurance module
- Customer replies or two-way chat
- Advanced campaign analytics dashboards

## User Roles

### Staff/Admin Users

Staff users and super admins in the web portal can:

- compose a custom broadcast title
- compose a custom broadcast message
- choose a target mode:
  - `selected_cases`
  - `filtered_results`
- preview the size and eligibility of the audience
- confirm and send the broadcast
- review the send result summary
- inspect broadcast activity in the insurance case activity trail

### Customer Users

Customers receive the broadcast as an in-app notification only. There is no special customer broadcast inbox in this phase beyond the existing in-app notification experience.

## Product Shape

Phase 4C lives inside `/insurance` as a staff/admin tool embedded in the existing insurance queue workspace.

The workflow is:

1. Staff filters the insurance queue or selects specific cases
2. Staff enters a custom broadcast title and message
3. The system previews matched cases, eligible active cases, and deduplicated customers
4. Staff confirms the send
5. The backend resolves final recipients, excludes ineligible cases, deduplicates customers, and creates in-app notifications
6. The UI shows a send result summary
7. The related insurance inquiries record `manual_broadcast_sent` activity entries

## Design Decisions

### 1. Insurance-only targeting

Phase 4C targets only insurance-related customers and cases. It does not attempt to reach broader customer groups from bookings, service history, or general CRM-style segments.

This keeps the feature aligned with the insurance module and avoids premature expansion into a larger business-wide campaign system.

### 2. Fully custom message content

Staff can write a custom title and custom message rather than choosing from predefined campaign templates.

This gives staff enough flexibility for:

- renewal promos
- insurance product updates
- document completion pushes
- payment follow-up pushes

Because the content is custom, the system must add stronger validation and confirmation guardrails before sending.

### 3. Both target modes are supported

The broadcast tool supports:

- `selected_cases`
- `filtered_results`

`selected_cases` is better for precise operator control. `filtered_results` is better for larger operational sends such as renewal-focused or document-completion-focused broadcasts.

### 4. Active/non-terminal targeting only

Broadcasts only send to active, non-terminal insurance cases.

The system excludes:

- `closed`
- `cancelled`
- `rejected`

This prevents irrelevant or misleading messages from reaching customers whose insurance cases are already complete or no longer actionable.

### 5. Deduplicate by customer

If a customer matches multiple eligible insurance cases within one send action, the system sends only one in-app broadcast notification to that customer.

This avoids spam and makes filtered-results mode safe for customers with multiple linked insurance records.

### 6. In-app only delivery

Broadcasts use the existing notification infrastructure but are delivered only through the in-app notification channel.

No email or SMS delivery is included in this phase.

### 7. Staff-side audit trail uses existing insurance activity

The first version does not create a separate campaigns page. Instead, each affected insurance inquiry records a `manual_broadcast_sent` activity entry that becomes visible through the existing insurance activity history.

This keeps the implementation smaller and consistent with earlier reminder/history work.

## Web Admin UX

### Broadcast Panel

Add a broadcast panel inside the existing `/insurance` workspace.

Recommended fields:

- `Target Mode`
  - Selected Cases
  - Filtered Results
- `Broadcast Title`
- `Broadcast Message`
- `Audience Preview`
  - matched cases
  - eligible cases
  - deduplicated customers

The panel should clearly distinguish itself from the manual reminder block so staff understands:

- reminders are workflow-oriented nudges
- broadcasts are broader custom outreach

### Guardrails Before Send

Before sending, validate:

- title is non-empty
- message is non-empty
- values are trimmed
- title and message do not exceed max length
- target mode has a resolvable audience
- selected-cases mode has at least one selected case
- filtered-results mode has meaningful active queue filters or a deliberate full active queue send rule

Before the final send, show a confirmation step with:

- target mode
- targeted case count
- eligible case count
- deduplicated customer count
- skipped case count
- skipped reason categories

### Result Summary After Send

After the send completes, show:

- targeted case count
- eligible case count
- deduplicated customer count
- sent count
- skipped count
- failed count

The summary should be visible in-page and optionally expandable into a detailed breakdown.

### History Visibility

Broadcast actions should appear in the existing insurance case activity trail using:

- `manual_broadcast_sent`

The first version does not require a separate campaigns log page.

## Backend Design

### Route

Create a dedicated route:

- `POST /api/insurance/broadcasts/send`

This route should remain separate from:

- workflow update routes
- manual reminder routes

Broadcasts differ from reminders because they support fully custom content and broader operational targeting.

### Request Payload

Recommended payload:

```json
{
  "targetMode": "selected_cases",
  "selectedIds": ["inq_1", "inq_2"],
  "filters": {
    "purpose": "renewal",
    "status": "for_renewal",
    "paymentStatus": "all",
    "renewalStatus": "awaiting_customer"
  },
  "title": "Renew your policy this week",
  "message": "We have renewal support ready for your current insurance request. Open the app to review the next steps."
}
```

Notes:

- `selectedIds` is required for `selected_cases`
- `filters` is required for `filtered_results`
- `title` and `message` are always required

### Eligibility Rules

Eligible cases must:

- belong to an insurance inquiry in an active, non-terminal state
- have a resolvable customer target

Automatically exclude:

- `closed`
- `cancelled`
- `rejected`
- cases missing customer linkage or a deliverable customer notification target

Then deduplicate by customer so a customer receives one notification per send action.

### Broadcast Result Model

Recommended response:

```json
{
  "targetedCaseCount": 12,
  "eligibleCaseCount": 10,
  "deduplicatedCustomerCount": 8,
  "sentCount": 8,
  "skippedCount": 2,
  "failedCount": 0,
  "results": [
    {
      "inquiryId": "inq_1",
      "customerId": "cust_1",
      "status": "sent"
    }
  ]
}
```

The response should support:

- top-level operator confidence
- optional UI detail breakdown for skipped or failed items

### Notification Storage

For each final deduplicated customer recipient:

- create a normal notification record
- use `in_app` channel
- mark it internally as a manual insurance broadcast event type

### Audit Trail

For each affected eligible insurance inquiry, append an activity entry:

- `manual_broadcast_sent`

Recommended stored note fields should preserve at least:

- broadcast title
- sender identity
- timestamp

This supports later staff review inside the Activity tab without building a separate campaign log in Phase 4C.

## Validation Rules

### Title

- required
- trimmed
- minimum meaningful length
- maximum length enforced

### Message

- required
- trimmed
- minimum meaningful length
- maximum length enforced

### Audience

- cannot send to an empty audience
- cannot send to terminal-only results
- cannot send if all targets become ineligible after eligibility evaluation

## Error Handling

### Staff-facing errors

The UI should show clear errors for:

- no selected cases
- empty filtered audience
- no eligible active cases
- validation failures for title or message
- backend delivery failures

### Partial send behavior

If some cases/customers send successfully while others fail:

- keep successful sends
- report partial failure in the summary
- preserve skipped and failed reasons in the result payload

This is better than failing the whole batch after some recipients already received the message.

## Security and Safety

- Only authenticated staff/admin users can send broadcasts
- The backend must derive actor identity from auth context
- The backend must not trust the frontend for eligibility
- The system must not send to terminal cases even if the frontend payload includes them
- The system must not create multiple duplicate customer notifications for the same send action

## Testing Strategy

### Backend

Add tests for:

- selected-cases target mode
- filtered-results target mode
- active/non-terminal eligibility enforcement
- customer deduplication
- empty audience rejection
- title/message validation
- activity append behavior
- partial success and failure handling

### Frontend

Add tests for:

- payload building for selected and filtered modes
- validation behavior for title/message and target modes
- audience summary/result summary rendering logic
- send result summary formatting

### Manual QA

Verify on the real root system at:

- `http://127.0.0.1:3002/insurance`

Check:

- selected cases send path
- filtered results send path
- duplicate-customer scenario
- terminal-case exclusions
- activity trail entries after send

## Implementation Boundaries

### Included in Phase 4C

- insurance-only custom in-app broadcasts
- fully custom title and message
- selected and filtered targeting
- active/non-terminal eligibility rules
- deduplicated customer delivery
- send result summary
- staff-side history through activity trail

### Not Included in Phase 4C

- email delivery
- SMS delivery
- scheduled campaigns
- automatic repeated sends
- whole-business customer broadcasts
- customer replies
- analytics dashboard for campaign performance

## Rollout Recommendation

Implement in this order:

1. backend broadcast route and eligibility engine
2. frontend broadcast panel in `/insurance`
3. validation and confirmation flow
4. send result summary
5. activity trail wiring
6. tests and docs

## Post-Phase Outlook

After Phase 4C, the insurance module will no longer be missing a major workflow-facing feature phase. Remaining work should shift toward:

- polish
- QA
- better demo/seed data
- optional enhancements such as scheduled repeats or extra delivery channels later
