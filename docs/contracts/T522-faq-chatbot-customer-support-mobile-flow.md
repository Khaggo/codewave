# T522 FAQ Chatbot Customer Support Mobile Flow

## Slice ID

`T522`

## Source Of Truth

- `docs/architecture/domains/main-service/chatbot.md`
- `docs/architecture/tasks/05-client-integration/T522-faq-chatbot-customer-support-mobile-flow.md`
- `docs/contracts/T114-faq-chatbot-v1.md`
- live controller: `backend/apps/main-service/src/modules/chatbot/controllers/chatbot.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `POST /api/chatbot/messages` | `live` | Swagger/controller |
| `POST /api/chatbot/escalations` | `live` | Swagger/controller |
| `GET /api/chatbot/intents` | `live` | Swagger/controller, but staff-only and out of scope for customer mobile |

## Mobile Surface

- customer support screen: `mobile/src/screens/ChatbotScreen.js`
- mobile client boundary: `mobile/src/lib/chatbotClient.js`
- app route: `mobile/App.js`
- customer quick entry: `mobile/src/screens/LandingPage.js` and dashboard quick action in `mobile/src/screens/Dashboard.js`

## Frontend Contract Files

- `frontend/src/lib/api/generated/chatbot/requests.ts`
- `frontend/src/lib/api/generated/chatbot/responses.ts`
- `frontend/src/lib/api/generated/chatbot/errors.ts`
- `frontend/src/lib/api/generated/chatbot/customer-mobile-support.ts`
- `frontend/src/mocks/chatbot/mocks.ts`

## Frontend States To Cover

- customer session required state before live support lookups can run
- answered FAQ state for deterministic booking, insurance, and workshop prompts
- lookup-resolved state for the signed-in customer's latest booking or latest insurance inquiry
- lookup-empty state when the customer has no matching booking or insurance record yet
- unsupported-prompt escalation state when the backend opens an escalation automatically
- manual escalation state when the customer still needs staff follow-up after a supported answer

## Deep-Link Rules

- booking answers may open the booking tab or booking tracking state in the customer dashboard only
- insurance answers may open the customer insurance inquiry screen only
- no deep link may expose staff-only schedules, queues, or review notes

## Post-Core Rollout Note

- This mobile support enhancement intentionally follows the core operational chain: notifications, job-order follow-through, QA visibility, back-jobs, and analytics were completed first so customer support can point at stable live surfaces instead of speculative placeholders.

## Notes

- The chatbot remains deterministic and FAQ oriented. No generative repair, billing, or claims advice is introduced here.
- Unsupported prompts escalate immediately so the mobile client never fabricates an answer.
- Manual escalation is explicit in the UI rather than hidden behind a generic failure state.
