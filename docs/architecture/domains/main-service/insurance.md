# insurance

## Domain ID

`main-service.insurance`

## Agent Summary

Load this doc for CTPL or comprehensive insurance inquiries, supporting documents, and internal insurance workflow tracking. Skip it for direct insurer integration assumptions or claim settlement behavior.

## Primary Objective

Track insurance-related customer workflow and evidence without implying direct insurer APIs or automated claim approval.

## Inputs

- customer inquiry payloads
- vehicle and user references
- supporting document metadata
- staff review and status updates

## Outputs

- `insurance_inquiries`
- insurance document records
- optional insurance tracking records
- notification and lifecycle triggers

## Dependencies

- `main-service.users`
- `main-service.vehicles`

## Owned Data / ERD

Primary tables or equivalents:
- `insurance_inquiries`
- `insurance_documents`
- `insurance_records`

Key relations:
- one user and one vehicle may have many insurance inquiries
- one inquiry may have many supporting documents
- `insurance_records` are optional follow-on records

## Primary Business Logic

- accept insurance-related inquiries from the owning customer or authorized staff
- distinguish inquiry intake for CTPL and comprehensive cases without implying insurer-side processing
- store supporting document metadata and review state
- track inquiry state from submission to resolution or closure
- create optional `insurance_records` when staff review approves an inquiry for longer-lived tracking
- expose inquiry updates to notifications and lifecycle modules
- keep direct insurer integration out of assumed scope unless explicitly added later

## Process Flow

1. Customer or authorized staff submits an insurance inquiry for a customer-owned vehicle.
2. Required metadata is recorded and supporting documents can be attached while the inquiry remains open.
3. Staff reviews and updates inquiry status through the internal workflow.
4. When the inquiry reaches `approved_for_record`, an `insurance_record` is created or refreshed for vehicle-level tracking.
5. Notifications and lifecycle updates are generated later as dependent integrations.

## Use Cases

- customer submits an insurance concern
- customer uploads supporting documents for their own inquiry
- staff reviews uploaded documents
- service adviser or super admin advances inquiry status and creates a tracking record
- customer reads vehicle-level insurance records after review approval

## API Surface

- `POST /insurance/inquiries`
- `GET /insurance/inquiries/:id`
- `PATCH /insurance/inquiries/:id/status`
- `POST /insurance/inquiries/:id/documents`
- `GET /vehicles/:id/insurance-records`

## Edge Cases

- incomplete document submission
- large files fail to upload after inquiry creation
- customer attempts to open an inquiry for another customer's vehicle
- customer attempts to read a foreign insurance inquiry or vehicle insurance record
- closed or rejected inquiries receive more document uploads
- users expect direct insurer integration when the module only tracks internal workflow
- inquiry closes without clear record linkage

## Writable Sections

- inquiry lifecycle, insurance-owned records, document-handling rules, insurance APIs, and insurance edge cases
- do not imply insurer settlement, claim approval, or bank/payment automation here

## Out of Scope

- direct insurer APIs
- automated claim approval
- payment settlement
