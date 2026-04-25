# Customer Insurance Document Upload Mobile Flow

## Task ID

`T534`

## Title

Add customer-mobile document upload support for insurance inquiries.

## Type

`client-integration`

## Status

`done`

## Priority

`high`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/insurance.md`
- `../../frontend-backend-sync.md`
- `../01-main-service/T110-insurance-inquiry-core.md`
- `T514-insurance-customer-intake-mobile-flow.md`
- `T515-insurance-review-and-status-web-flow.md`

## Depends On

- `T110`
- `T514`
- `T515`

## Goal

Make the mobile Insurance Inquiry module match the progress report wording by letting customers attach supporting documents to an existing inquiry through the live `POST /api/insurance/inquiries/:id/documents` route.

## Deliverables

- mobile insurance client helper for document attachment
- stable customer-facing document draft shape and validation
- mobile UI for adding at least document metadata and a file URL/reference to an inquiry
- status-aware handling when staff moves an inquiry to `needs_documents`
- contract/mock updates for supported document types and error states

## Implementation Notes

- live backend document upload accepts JSON document metadata and a `fileUrl`; binary file storage remains out of scope unless a real upload service exists
- use documented document types such as `policy`, `photo`, `or_cr`, `estimate`, and `other`
- normalize the updated inquiry response in `mobile/src/lib/insuranceClient.js`
- do not invent a new backend endpoint if `POST /api/insurance/inquiries/:id/documents` already satisfies the slice
- use `port-aware-dev-runtime` before any live backend or Expo check

## Acceptance Checks

- customer can create an insurance inquiry from mobile
- customer can attach a valid supporting document to that inquiry
- mobile shows the updated document count after upload
- invalid document type and closed/rejected inquiry states show clear errors
- staff insurance review sees the attached document in the web portal

## Completion Notes

- Added mobile document metadata draft state for `fileName`, `fileUrl`, `documentType`, and optional notes.
- Added `addInsuranceInquiryDocument` in `mobile/src/lib/insuranceClient.js`, with client-side validation for missing inquiry, unsupported document type, missing file reference, and closed/rejected upload locks.
- Updated `mobile/src/screens/InsuranceInquiryScreen.js` so customers can attach supporting documents to the latest inquiry and immediately see the updated document count and document list.
- Added `needs_documents` copy so customers understand why staff requested more files.
- Updated staff web insurance detail so advisers/admins can see attached supporting document metadata, not only the document count.
- Updated generated insurance contract helpers and mocks with customer document upload states, document type options, uploaded-document presentation, and the live `uploadInquiryDocument` route.

## Validation Evidence

- `cd backend && npm test -- insurance.service.spec.ts insurance.integration.spec.ts` passed.
- `cd backend && node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit` passed.
- `cd frontend && npm run build` passed.
- `cd mobile && npx expo export --platform android --output-dir .runtime/export-t534-insurance-doc-upload` passed.
- Port-aware cleanup check found no active backend, web, Expo, or Metro listeners and no active Node process after validation.

## Out of Scope

- binary object storage
- camera/gallery native upload implementation
- insurance provider API integration
