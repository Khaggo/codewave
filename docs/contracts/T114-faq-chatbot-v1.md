# T114 FAQ Chatbot V1

## Slice ID

`T114`

## Source Of Truth

- `docs/architecture/domains/main-service/chatbot.md`
- `docs/architecture/tasks/01-main-service/T114-faq-chatbot-v1.md`
- live controller when implemented: `backend/apps/main-service/src/modules/chatbot/controllers/chatbot.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `POST /api/chatbot/messages` | `live` | Swagger/controller |
| `GET /api/chatbot/intents` | `live` | Swagger/controller |
| `POST /api/chatbot/escalations` | `live` | Swagger/controller |

## Internal Contract Status

| Contract | Status | Source |
| --- | --- | --- |
| `chatbot_intents` deterministic catalog | `live` | main-service chatbot repository |
| `chatbot_rules` keyword routing | `live` | main-service chatbot repository |
| `chatbot_conversations` response log | `live` | main-service chatbot repository |
| `chatbot_escalations` staff handoff log | `live` | main-service chatbot repository |

## Frontend Contract Files

- `frontend/src/lib/api/generated/chatbot/requests.ts`
- `frontend/src/lib/api/generated/chatbot/responses.ts`
- `frontend/src/lib/api/generated/chatbot/errors.ts`
- `frontend/src/mocks/chatbot/mocks.ts`

## Frontend States To Cover

- booking FAQ answer card
- insurance requirements FAQ answer card
- latest booking status lookup card
- latest insurance inquiry status lookup card
- unsupported prompt escalation confirmation
- forbidden state when a customer tries to load staff-only intent review

## Notes

- `T114` is intentionally deterministic and rule-based; no generative AI behavior is allowed in this slice.
- The current live lookup scope is limited to the signed-in user’s latest booking and latest insurance inquiry.
- Unsupported prompts escalate immediately so the chatbot never fabricates troubleshooting, billing, or claims advice.
- Workshop-hours phrasing is kept intentionally generic so the chatbot does not invent schedule commitments that are not yet codified elsewhere in the SSoT.
