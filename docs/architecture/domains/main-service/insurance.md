# insurance

## Purpose

Own insurance-related customer inquiries, supporting documents, and the internal tracking state for insurance assistance workflows.

## Owned Data / ERD

Primary tables or equivalents:
- `insurance_inquiries`
- `insurance_documents`
- `insurance_records`

Key relations:
- one user and one vehicle may have many insurance inquiries
- one inquiry may have many supporting documents
- `insurance_records` are optional follow-on records when the business needs a structured record beyond the inquiry

## Primary Business Logic

- accept insurance-related inquiries from customers or staff
- store supporting document metadata and review status
- track inquiry state from submission to resolution or closure
- expose inquiry updates to notifications and lifecycle modules
- keep external insurer integration out of assumed scope unless explicitly added later

## Process Flow

1. Customer submits insurance inquiry
2. Required metadata and files are recorded
3. Staff reviews and updates inquiry status
4. Notifications and lifecycle updates are generated as needed
5. Optional insurance record is attached for longer-lived tracking

## Use Cases

- customer submits an insurance concern
- staff reviews uploaded documents
- admin checks inquiry status history

## API Surface

- `POST /insurance/inquiries`
- `GET /insurance/inquiries/:id`
- `PATCH /insurance/inquiries/:id/status`
- `POST /insurance/inquiries/:id/documents`
- `GET /vehicles/:id/insurance-records`

## Edge Cases

- incomplete document submission
- large files fail to upload after inquiry creation
- users expect direct insurer integration when the module only tracks internal workflow
- inquiry closes without clear record linkage

## Dependencies

- `users`
- `vehicles`
- `notifications`
- `vehicle-lifecycle`
- `analytics`

## Out of Scope

- direct insurer APIs
- automated claim approval
- payment settlement
