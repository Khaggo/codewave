# T509 Staff Auth Session And Role Gating Web Flow

## Slice ID

`T509`

## Source Of Truth

- `docs/architecture/domains/main-service/auth.md`
- `docs/architecture/rbac-policy.md`
- `docs/architecture/tasks/05-client-integration/T509-staff-auth-session-and-role-gating-web-flow.md`
- `docs/team-flow-staff-admin-web-lifecycle.md`
- live controller: `backend/apps/main-service/src/modules/auth/controllers/auth.controller.ts`
- web shell: `frontend/src/components/layout/AppShell.js`
- web sidebar: `frontend/src/components/layout/Sidebar.js`

## Route Status

| Route | Status | Source | Web Purpose |
| --- | --- | --- | --- |
| `POST /api/auth/login` | `live` | Swagger/controller | create a staff web session for activated staff credentials |
| `POST /api/auth/refresh` | `live` | Swagger/controller | restore a stored staff session without showing the login form |
| `GET /api/auth/me` | `live` | Swagger/controller | validate the current bearer token before portal navigation is shown |

## Staff Portal Access States

| State | Meaning |
| --- | --- |
| `unauthenticated` | no usable staff session exists and the login screen must be shown |
| `login_submitting` | login request is in flight and duplicate submit must be blocked |
| `session_restoring` | portal is validating or refreshing a stored session |
| `technician_session_active` | active technician session may enter technician-visible web navigation |
| `service_adviser_session_active` | active service adviser session may enter adviser-visible web navigation |
| `super_admin_session_active` | active super admin session may enter full admin navigation |
| `customer_blocked` | authenticated customer identity must be removed from the staff portal immediately |
| `pending_staff_blocked` | provisioned staff identity is not yet activated and must not be treated as a usable web session |
| `deactivated_staff_blocked` | staff identity exists but is deactivated and must be blocked distinctly |
| `forbidden_navigation` | valid staff session exists but the role may not enter the requested workspace |
| `session_restore_failed` | stored session is stale or invalid and the portal must fall back to login |

## Role-Gated Navigation Surface

| Route | Technician | Service Adviser | Super Admin |
| --- | --- | --- | --- |
| `/` | visible | visible | visible |
| `/vehicles` | visible | visible | visible |
| `/bookings` | blocked | visible | visible |
| `/backjobs` | blocked | visible | visible |
| `/timeline` | blocked | visible | visible |
| `/insurance` | blocked | visible | visible |
| `/shop` | blocked | visible | visible |
| `/loyalty` | blocked | visible | visible |
| `/admin/qa-audit` | blocked | visible | visible |
| `/admin/summaries` | blocked | visible | visible |
| `/admin/catalog` | blocked | blocked | visible |
| `/admin/inventory` | blocked | blocked | visible |
| `/admin/appointments` | blocked | visible | visible |
| `/settings` | visible | visible | visible |

## Frontend Contract Files

- `frontend/src/lib/api/generated/auth/requests.ts`
- `frontend/src/lib/api/generated/auth/responses.ts`
- `frontend/src/lib/api/generated/auth/identity-foundation.ts`
- `frontend/src/lib/api/generated/auth/staff-web-session.ts`
- `frontend/src/mocks/auth/mocks.ts`
- `frontend/src/components/layout/AppShell.js`
- `frontend/src/components/layout/Sidebar.js`
- `frontend/src/lib/authClient.js`

## Error And Blocked-State Handling

- customer identities must receive a dedicated portal-blocked message, not a generic login error
- deactivated staff accounts must receive a dedicated blocked message, not a generic login error
- pending staff activation remains a distinct blocked state in the contract pack even though normal login still uses the shared login endpoint
- stale stored sessions must fall back to login with a restore-specific message
- role-gated navigation must remain explicit; hidden routes are not an authorization replacement

## Acceptance States

- login with active technician session and show technician-safe navigation only
- login with active service adviser session and show adviser navigation
- login with active super admin session and show full admin navigation
- reject customer session from the staff portal
- clear and block deactivated stored staff session distinctly
- clear stale stored session and return to login
- keep forbidden-navigation state explicit for role-blocked pages

## Notes

- This slice covers staff web login, restore, and entry-state gating only.
- Staff provisioning and pending activation creation remain owned by earlier auth tasks and later web slices.
- Page-level RBAC checks still remain necessary even when the sidebar hides a route.
