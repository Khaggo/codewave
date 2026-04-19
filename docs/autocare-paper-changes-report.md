# AUTOCARE Paper Changes Guide

Date: 2026-04-18  
Status: Paper-only guidance for documentation updates based on the current paper, canonical architecture docs, and live repo code

## Purpose

This guide is for teammates who will update the AUTOCARE paper.

It focuses only on what should be changed in the document itself. It does not cover system implementation work or code-level changes. Those stay in [autocare-paper-system-alignment-report.md](./autocare-paper-system-alignment-report.md).

## Short Version

The good news is that the paper does not need a full rewrite.

The main direction is still good:
- web stays `Next.js`
- mobile stays `React Native`
- the chatbot stays a FAQ and common-inquiry assistant

What needs attention is mostly wording and scope:
- loyalty needs a clearer definition for ecommerce earning
- notifications should reflect email-only current scope
- chatbot wording should be separated from generative AI features
- auth and integration wording should match the current target system

## What We Can Keep

These parts are already pointing in the right direction and can stay with little or no change:

- The web direction is good. The paper already aligns with a `Next.js` web application.
- The mobile direction is good. The paper already aligns with a `React Native` customer mobile app.
- The idea of a 24/7 FAQ-style chatbot is also good. That still fits the current intended product behavior.

## What Should Be Updated

### 1. Clarify the product surfaces

The paper should reflect that the project now has both:
- a real web app in `frontend/`
- a real mobile app in `mobile/`

Right now, some wording still sounds like mobile is only a future direction. For the paper, it would be better to describe web and mobile as active product surfaces.

### 2. Tighten the loyalty wording

The paper says loyalty points are earned from completed service work and ecommerce purchases. That direction is fine and should stay.

What needs to be clearer is what counts as an ecommerce purchase. In the paper, this should mean a paid or settled ecommerce order or invoice, not:
- cart creation
- checkout start
- invoice creation by itself
- unpaid order state

This small clarification will prevent confusion later.

### 3. Update the notification wording

The paper currently reads as if push notifications are part of the present scope.

For now, the safer wording is that current notification scope is email-based. If the paper still wants to mention push notifications, it should be described as a possible future enhancement, not as a current feature.

### 4. Separate chatbot language from generative AI language

The paper should clearly distinguish between:
- the chatbot, which is a FAQ and common-inquiry assistant with escalation
- generative AI features, which are used for reviewed summaries and support functions

This matters because otherwise the paper can accidentally imply that AUTOCARE already has a customer-facing generative chatbot, which is not the intended direction.

### 5. Update the target auth wording

The paper should describe the target direction as:
- `Google verification + email OTP`

If username/password flows are still mentioned, they should be framed as legacy or transition behavior, not as the long-term target model.

### 6. Correct the integration wording

The paper currently says there is no real-time third-party integration. That is too broad now.

The updated paper should acknowledge the approved external exceptions that already matter to the system direction:
- Google identity verification
- SMTP email delivery
- governed AI-provider integration policy

## Suggested Writing Direction

If the team wants a simple editing approach, this is the safest direction to follow:

- Keep the product vision.
- Do not rewrite the entire paper.
- Update the wording in the sections that describe loyalty, notifications, chatbot scope, auth, and integrations.
- Make the paper read as a current product-and-architecture description, not as an early concept draft.

## Recommended Edit Checklist

- Keep `Next.js` for web.
- Keep `React Native` for mobile.
- Describe `frontend/` and `mobile/` as real product surfaces.
- Keep loyalty from service work and ecommerce purchases, but define ecommerce earning as paid or settled purchase facts only.
- Replace current-scope push wording with email-only wording.
- Keep the chatbot FAQ-oriented and escalation-aware.
- Separate chatbot behavior from generative AI summary features.
- Update auth wording to `Google verification + email OTP`.
- Update the integration section so approved external exceptions are described accurately.

## Source Material Checked

- `c:\Users\casio\Downloads\Copy of AUTOCARE.md`
  - loyalty direction: lines 29 and 501
  - auth and integration wording: lines 67 and 509-517
  - web and mobile framework direction: lines 331-342
  - chatbot, AI summary, and QA wording: lines 23-27, 41-48, and 426
  - push-notification wording: line 416

## Reference Sources Used

- `docs/architecture/system-architecture.md`
- `docs/architecture/auth-security-policy.md`
- `docs/architecture/api-strategy.md`
- `docs/architecture/domain-map.md`
- `docs/architecture/domains/main-service/chatbot.md`
- `docs/architecture/domains/main-service/notifications.md`
- `docs/architecture/domains/main-service/loyalty.md`
- `docs/architecture/tasks/05-client-integration/README.md`
- `mobile/package.json`
- `frontend/package.json`
