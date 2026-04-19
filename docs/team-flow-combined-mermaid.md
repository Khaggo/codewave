# AUTOCARE Combined Mermaid Pack

Date: 2026-04-18  
Purpose: Three Mermaid-safe diagrams: a unified flow, a dedicated admin flow, and a required-data map, updated for service-payment-only loyalty.

## 1. Combined System Flow

```mermaid
flowchart TD
  C1[Mobile Entry] --> C2[Register]
  C2 --> C3[Add Vehicle]
  C3 --> C4[Verify OTP]
  C4 --> C5[Account Active]
  C5 --> C6[Customer Home]

  C6 --> C7[Book Service]
  C7 --> C8[Slot Check]
  C8 --> C9[Booking Confirmed]

  C6 --> C10[Insurance Inquiry]
  C10 --> C11[Claim Tracking]

  C6 --> C12[Loyalty]
  C12 --> C13[Redeem Reward]

  C6 --> C14[Shop]
  C14 --> C15[Cart]
  C15 --> C16[Checkout]
  C16 --> E1[Create Order]
  E1 --> E2[Reserve Stock]
  E2 --> E3[Invoice and Payment]
  E3 --> E4[Fulfillment]

  S1[Web Entry] --> S2[Staff Login]
  S2 --> S3[Role Check]
  S3 --> S4[Dashboard]
  S4 --> S5[Booking Queue]
  S5 --> S6[Create Job Order]
  S6 --> S7[Assign Tech]
  S7 --> S8[Work Update]
  S8 --> S9[Upload Evidence]
  S9 --> S10[QA Review]
  S10 --> S11[Human Review]
  S11 --> S12[Release Approved]
  S11 --> S17[Rework Needed]
  S4 --> S13[Insurance Queue]
  S13 --> S14[Claim Update]
  S4 --> S15[Loyalty Admin]
  S15 --> S15A[Configure Rewards]
  S15 --> S15B[Configure Earning Rules]
  S4 --> S16[Staff Provision]

  C9 --> S5
  C9 --> A1[Booking Notice]
  C9 --> A2[Timeline Update]

  S12 --> A2
  S12 --> A3[Customer Summary]
  S12 --> A11[Service Invoice Finalized]
  A11 --> A12[Service Payment Recorded]
  A12 --> A13[Evaluate Earning Rules]
  A13 --> A14[Points Earned]
  A14 --> A15[Reward or Benefit Eligible]

  S14 --> A4[Claim Notice]

  E1 --> A5[Stock Update]
  E1 --> A6[Fulfillment Alert]

  C4 --> A7[OTP Job]
  A7 --> A8[Email Delivery]

  S10 --> A9[AI QA Job]
  A9 --> A10[AI Adapter]
```

## 2. Required Data by Major Node

```mermaid
flowchart LR
  N1[Register] --> N1A[UI: name, email, phone, password]
  N1 --> N1B[System: unique email check, risk check]

  N2[Add Vehicle] --> N2A[UI: plate, make, model, year]
  N2 --> N2B[System: customer onboarding context]

  N3[Verify OTP] --> N3A[UI: OTP code]
  N3 --> N3B[System: pending account id, otp challenge]
  N3 --> N3C[External: email delivery already completed]

  N4[Book Service] --> N4A[UI: service type, date, time, vehicle]
  N4 --> N4B[System: active customer session, owned vehicle]
  N4 --> N4C[System: slot inventory]

  N5[Insurance Inquiry] --> N5A[UI: inquiry details, attachments]
  N5 --> N5B[System: customer id, vehicle id, owner autofill]

  N6[Redeem Reward] --> N6A[UI: reward choice]
  N6 --> N6B[System: loyalty account, points balance]

  N7[Checkout] --> N7A[UI: cart items, quantity, checkout action]
  N7 --> N7B[System: product snapshot, stock state]
  N7 --> N7C[System: active customer session]

  N8[Create Job Order] --> N8A[UI: adviser decision, technician assignment]
  N8 --> N8B[System: confirmed booking id, adviser id]

  N9[QA Review] --> N9A[UI: diagnosis notes, evidence, reviewer decision]
  N9 --> N9B[System: job order id, QA state]
  N9 --> N9C[External: AI analysis if enabled]

  N10[Claim Update] --> N10A[UI: new claim status, optional note]
  N10 --> N10B[System: inquiry or claim id]

  N11[Staff Provision] --> N11A[UI: staff email, role, staff code]
  N11 --> N11B[System: super admin session, pending activation state]

  N12[Service Payment Recorded] --> N12A[UI: payment entry, paid amount, cashier or adviser action]
  N12 --> N12B[System: finalized invoice record, customer id, vehicle id]
  N12 --> N12C[System: active earning rules, qualifying service metadata]

  N13[Configure Earning Rules] --> N13A[UI: rule name, formula, thresholds, filters]
  N13 --> N13B[System: super admin session, audit trail]

  N14[Configure Rewards] --> N14A[UI: reward name, points cost, benefit description, fulfillment note]
  N14 --> N14B[System: super admin session, reward catalog audit trail]
```

## 3. Admin / Staff Flow

```mermaid
flowchart TD
  A1[Web Entry] --> A2[Staff Login]
  A2 --> A3[Role Check]
  A3 --> A4[Admin Dashboard]

  A4 --> A5[Booking Queue]
  A5 --> A6[Create Job Order]
  A6 --> A7[Assign Technician]
  A7 --> A8[Work Update]
  A8 --> A9[Upload Evidence]
  A9 --> A10[QA Review]
  A10 --> A11[Release Approved]
  A10 --> A12[Return for Rework]

  A4 --> A13[Insurance Queue]
  A13 --> A14[Claim Update]

  A4 --> A15[Loyalty Admin]
  A15 --> A16[Configure Rewards]
  A15 --> A17[Configure Earning Rules]
  A15 --> A18[Monitor Redemptions]

  A4 --> A19[Staff Provision]
  A19 --> A20[Pending Activation]

  A11 --> A21[Service Invoice Finalized]
  A21 --> A22[Service Payment Recorded]
  A22 --> A23[Evaluate Earning Rules]
  A23 --> A24[Points Earned]
```

## Usage Note

- Use the first diagram when you want a single merged flow for presentation or overview.
- Use the second diagram when you want to explain what data each major node depends on.
- Use the third diagram when you need a standalone admin/staff Mermaid flow.
- Loyalty is earned only from successful paid service work, not from ecommerce checkout.
- If your Mermaid renderer is strict, test this file first before using the more detailed engineering documentation.
