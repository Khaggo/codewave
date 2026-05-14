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
- supporting document metadata and binary uploads
- staff review and workflow updates

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
- store supporting document metadata, uploaded file references, and review state
- track inquiry state from submission through document follow-up, review, approval, payment, renewal, and closure
- expose staff list and customer-history reads for internal workflow operations
- automatically upsert follow-on `insurance_records` for vehicle tracking when an inquiry transitions to `closed`
- expose a live staff PATCH route that currently accepts only `status` and optional `reviewNotes`, even though broader phase-1 workflow metadata exists in service/design code
- expose inquiry updates to notifications and lifecycle modules
- keep direct insurer integration out of assumed scope unless explicitly added later

## Process Flow

1. Customer or authorized staff submits an insurance inquiry for a customer-owned vehicle.
2. Required metadata is recorded and supporting documents can be attached while the inquiry remains open through either the reference-document route or the binary upload route.
3. Staff lists inquiries, filters by workflow tags, reviews one inquiry in detail, and uses the live PATCH route for status changes plus optional review notes. Broader workflow metadata remains part of the intended phase-1 workflow model, but the current controller contract is not yet aligned with that richer edit payload.
4. Follow-on `insurance_records` support vehicle-level tracking records; the current service implementation upserts that record layer when an inquiry is moved to `closed`.
5. Notifications and lifecycle updates are generated later as dependent integrations.

## Use Cases

- customer submits an insurance concern
- customer uploads supporting documents for their own inquiry
- customer uploads payment proof or missing requirements after submission
- staff reviews uploaded documents
- service adviser or super admin filters, assigns, annotates, and advances inquiry workflow
- customer reads vehicle-level insurance records after the inquiry closes and the follow-on record is upserted automatically

## API Surface

- `POST /insurance/inquiries`
- `GET /insurance/inquiries`
- `GET /insurance/inquiries/:id`
- `GET /users/:id/insurance-inquiries`
- `PATCH /insurance/inquiries/:id/status`
- `POST /insurance/inquiries/:id/documents/upload`
- `POST /insurance/inquiries/:id/documents`
- `GET /vehicles/:id/insurance-records`

## Edge Cases

- incomplete document submission
- large files fail to upload after inquiry creation
- customer attempts to open an inquiry for another customer's vehicle
- customer attempts to read a foreign insurance inquiry or vehicle insurance record
- closed or rejected inquiries receive more document uploads
- workflow filters return no staff-visible cases
- the shipped web save payload includes broader workflow metadata fields that the live PATCH controller currently rejects
- phase-1 clients still contain legacy wording that should not be treated as canonical lifecycle status
- users expect direct insurer integration when the module only tracks internal workflow
- inquiry closes without clear record linkage

## Writable Sections

- inquiry lifecycle, insurance-owned records, document-handling rules, insurance APIs, and insurance edge cases
- do not imply insurer settlement, claim approval, or bank/payment automation here

## Out of Scope

- direct insurer APIs
- automated claim approval
- payment settlement
