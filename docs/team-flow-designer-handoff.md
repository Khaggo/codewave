# AUTOCARE Designer Flow Handoff

Date: 2026-04-18  
Purpose: Tight label set and redraw rules for Eraser, Figma, or presentation diagram cleanup

## Use This File For

- shortening labels consistently
- redrawing diagrams without guessing meanings
- keeping channel, service, and async boundaries visually consistent

## Visual Rules

- Use **4 diagram families** in presentations:
  - system overview
  - customer journey
  - staff journey
  - support flows
- Use **6 engineering diagrams** in technical docs:
  - overview
  - customer lifecycle
  - staff lifecycle
  - operational states
  - commerce states
  - async orchestration
- Use one color family per lane:
  - customer/mobile
  - staff/web
  - main-service
  - ecommerce-service
  - async/support
- Use solid arrows for synchronous flow.
- Use dashed arrows for events, jobs, and notifications.
- Do not mix customer and staff actions in the same main lane.

## Short Label Standard

Use these labels exactly unless the team agrees on a new standard.

### Customer / Mobile

| Long Label | Designer Label |
| --- | --- |
| Mobile App Entry | Mobile Entry |
| Start Registration | Register |
| Capture Identity and Contact Info | Add Identity |
| Capture Vehicle Details | Add Vehicle |
| Create Pending Account | Pending Account |
| Send Email OTP | Send OTP |
| Enter OTP | Enter OTP |
| Activate Account and Issue Session | Activate Account |
| Persist Customer Profile and First Vehicle | Save Profile and Vehicle |
| Customer Home | Customer Home |
| Start Booking | Book Service |
| Query Available Slots | Slot Check |
| Attempt Slot Hold | Hold Slot |
| Create Booking | Create Booking |
| Booking Confirmed | Booking Confirmed |
| Start Insurance Inquiry | Insurance Inquiry |
| Track Claim Status | Claim Tracking |
| View Loyalty Dashboard | Loyalty |
| Choose Reward / Redeem | Redeem Reward |
| Browse Ecommerce | Shop |
| Manage Cart | Cart |
| Checkout | Checkout |
| View Timeline | Timeline |

### Staff / Web

| Long Label | Designer Label |
| --- | --- |
| Web Portal Entry | Web Entry |
| Staff Login | Staff Login |
| Allowed Staff Role? | Role Check |
| Staff/Admin Dashboard | Dashboard |
| Calendar / Booking Queue | Booking Queue |
| View Appointment | Appointment |
| Convert Confirmed Booking to Job Order | Create Job Order |
| Assign Technician | Assign Tech |
| Job Order Active | Active Job |
| Update Progress / Diagnosis | Work Update |
| Upload Photo Evidence | Upload Evidence |
| Finalize Work | Finalize Work |
| Send to QA Review | QA Review |
| AI-Assisted QA Analysis | AI QA Check |
| Human Reviewer Decision | Human Review |
| Release Approved? | Release Check |
| Return for Rework / Override Process | Rework / Override |
| Review Insurance Queue | Insurance Queue |
| Update Claim Status | Claim Update |
| Configure Rewards and Earning Rules | Loyalty Admin |
| Provision Staff Accounts | Staff Provision |
| Staff Pending Activation | Pending Staff |

### Async / Support

| Long Label | Designer Label |
| --- | --- |
| RabbitMQ Events | Events |
| BullMQ Jobs | Jobs |
| Notification Service | Notifications |
| SMTP Email Delivery | Email Delivery |
| AI Provider Adapter | AI Adapter |
| Timeline Rebuild Job | Timeline Update |
| OTP Delivery Job | OTP Job |
| AI QA Analysis Job | AI QA Job |
| Fulfillment Alert | Fulfillment Alert |
| Reserve or Deduct Stock | Stock Update |

## Recommended Node IDs

Use short stable IDs if the diagram tool supports them.

### Customer

- `C1` Mobile Entry
- `C2` Register
- `C3` Add Identity
- `C4` Add Vehicle
- `C5` Pending Account
- `C6` Send OTP
- `C7` Enter OTP
- `C8` Activate Account
- `C9` Save Profile and Vehicle
- `C10` Customer Home
- `C11` Book Service
- `C12` Slot Check
- `C13` Booking Confirmed
- `C14` Insurance Inquiry
- `C15` Claim Tracking
- `C16` Loyalty
- `C17` Redeem Reward
- `C18` Shop
- `C19` Cart
- `C20` Checkout
- `C21` Timeline

### Staff

- `S1` Web Entry
- `S2` Staff Login
- `S3` Role Check
- `S4` Dashboard
- `S5` Booking Queue
- `S6` Create Job Order
- `S7` Assign Tech
- `S8` Active Job
- `S9` Work Update
- `S10` Upload Evidence
- `S11` QA Review
- `S12` Human Review
- `S13` Rework / Override
- `S14` Insurance Queue
- `S15` Loyalty Admin
- `S16` Staff Provision

### Support

- `A1` Events
- `A2` Jobs
- `A3` Notifications
- `A4` Email Delivery
- `A5` AI Adapter
- `A6` Timeline Update
- `A7` Stock Update
- `A8` Fulfillment Alert

## Layout Rules

- Put customers left-to-right or top-to-bottom in one direction only.
- Put staff/admin in a separate board or lane.
- Put async/support below or to the right, never mixed inside the main user path.
- Keep state diagrams separate from journey diagrams.
- Do not draw claim states, booking states, or commerce states as random terminal boxes in the same user journey.

## Safe Mermaid Guidance

If your team wants Mermaid-compatible diagrams:

- prefer `flowchart TD` or `flowchart LR`
- avoid overly long labels
- avoid mixing too many subgraphs in PM-facing diagrams
- avoid advanced features unless the target renderer supports them
- keep one diagram focused on one audience

For the safest rendering, the PM pack in:

- [team-flow-pm-summary-pack.md](./team-flow-pm-summary-pack.md)

uses only simple flowchart diagrams.
