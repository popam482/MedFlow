# MedFlow web authentication and doctor connection contract

This is the handoff contract for the frontend, backend and database teams.
The first delivery targets the responsive web app. Android Capacitor authentication
and deep links are outside this delivery. All development fixtures must be
synthetic. Hosted production deployment and the user's own Google consent/callback
remain separate from the local integration checks below.

Implemented: common PKCE authentication, separate patient/doctor entry, invitation
acceptance, patient connections, Claude's real doctor workspace, local QR generation
and all eight account APIs. Google is enabled and its real sign-in page is reachable.
Backend runs locally on 3001. Migrations 004, 005 and 006 have been applied to the
existing Supabase project; rollback SQL verifies grants, roles, invitations,
idempotence, rotation and association transactions. Backend has 22 passing HTTP/
unit checks. A live test with three explicitly approved synthetic Auth accounts
passed 12 scenarios through the real local backend and Supabase, including
concurrent duplicate requests and QR rotation. All three users, their profiles,
requests and invitation were then removed; cleanup counts were verified as zero.
This does not claim that the user's own Google consent/callback was completed by
the agent. Browser checks with synthetic OAuth/API responses additionally cover
return destinations, expired sessions, layout and background profile refresh.

## Ownership and current state

- Codex owns the shared Supabase client, auth provider/callback, route protection,
  patient Google login and patient connection flow.
- Claude's current round owns `Frontend/src/features/connections/**` only, as
  specified in CLAUDE_NEXT_TASK.md; the prior doctor module has been handed off.
- The user explicitly assigned account Backend/Database work to Codex. It was
  integrated on top of the colleagues' main revisions; medical/AI APIs are kept.
- Other colleagues' future Backend/AI/Database changes still need coordination.

Use one Supabase client and one auth provider. The existing doctor demo must
remain available only through `#/demo/doctor`; demo authentication and synthetic
patients must never stand in for a failed real session or API call.

## Configuration and browser flow

Frontend variables:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
VITE_API_BASE_URL=https://YOUR_API_ORIGIN
```

The API base may include a fixed path prefix. HTTPS is required outside local
development; HTTP is accepted only for localhost/loopback. Do not include query,
fragment, credentials or trailing endpoint names in this setting. The frontend
does not follow API redirects and sends bearer headers with `credentials: omit`.

Configure Google in Supabase and Google Cloud. The Google-authorized callback is
the Supabase project's OAuth callback. The application's post-login redirect is
`${window.location.origin}${import.meta.env.BASE_URL}auth/callback`; add the exact
development and production addresses to Supabase's redirect allowlist. Configure
hosting to serve the SPA for this callback path. App hash navigation is separate
from the callback path. Do not request Gmail access; only identity scopes are
needed. Test Google sign-in in a normal browser, not an embedded VS Code preview.

Use PKCE. Persist only the allowed internal return destination in session storage
for at most 15 minutes. Allowed destinations are `/patient`, `/doctor`, `/admin`,
`/connect/{code}` and `/doctor/invite/{token}`. Invalid, expired or external return
destinations fall back to `/patient`. Clear callback parameters and temporary
return state after consumption; do not log OAuth codes or invitation tokens.

Supabase proves identity. Backend `/me` proves application role. Never obtain a
doctor role from a URL, Google profile fields, user-editable auth metadata or a
frontend role selector. A normal first login provisions a patient profile on the
server; a doctor invitation can then promote that same identity atomically.

## Fixed frontend wire contract

Paths are relative to `VITE_API_BASE_URL`. JSON uses camelCase even when the
database uses snake_case. All successes below return a JSON object, including
mutation responses. Do not return an empty `204` body for these operations.

```ts
type Role = 'patient' | 'doctor';
type ConnectionStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

interface PublicDoctor {
  id: string;
  fullName: string;
  specialty: string;
  clinic: string;
}

interface AccountProfile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  activeDoctors: PublicDoctor[];
}

interface ConnectionRequest {
  id: string;
  status: ConnectionStatus;
  createdAt: string; // ISO 8601
  doctor: PublicDoctor;
  patient: { id: string; fullName: string };
}

interface ConnectionCode {
  code: string;
  url: string; // canonical HTTPS frontend connection URL
}
```

IDs and text fields are nonempty strings. `activeDoctors` is always an array,
including when empty or when the profile belongs to a doctor. It reflects active
assignments, not historical accepted requests. Only the public professional
doctor fields above belong in the public preview. No patient details, email,
medical content, session token or internal assignment state may appear there.

| Method and endpoint | Access and body | Successful response |
| --- | --- | --- |
| `GET /me` | Authenticated | `200 { "profile": AccountProfile }` |
| `POST /doctor-invitations/accept` | Authenticated; `{ "token": "opaque-invitation-token" }` | `200 { "profile": AccountProfile }`, with verified doctor role |
| `GET /connect/:code` | Public | `200 { "doctor": PublicDoctor }` |
| `POST /connection-requests` | Patient; `{ "code": "opaque-doctor-code" }` | `201 { "request": ConnectionRequest }`, or `200` for an idempotent existing result |
| `GET /connection-requests` | Authenticated | `200 { "requests": ConnectionRequest[] }` scoped to caller |
| `PATCH /connection-requests/:id` | `{ "action": "accept" \| "reject" \| "cancel" }` | `200 { "request": ConnectionRequest }` |
| `GET /doctor/connection-code` | Verified doctor | `200 { "connectionCode": ConnectionCode }` |
| `POST /doctor/connection-code/rotate` | Verified doctor; `{}` | `200 { "connectionCode": ConnectionCode }` |

Every authenticated call sends `Authorization: Bearer <Supabase access token>`.
The backend validates the token and derives identity/role from trusted server
state. It never accepts a caller identity or doctor role from the request body.
`PATCH accept/reject` is restricted to the request's doctor; `cancel` to its
patient. Both list access and per-record access must be enforced server-side.

Account endpoints validate JWTs with Supabase Auth using the public key, then call
restricted SECURITY DEFINER RPCs with that same user JWT. SQL derives auth.uid()
internally and checks Google identity and email confirmation. This allows account
flows without a service-role key or direct table grants. The platform admin API
works the same way. The operator CLI for invitation creation/revocation and the
existing medical-case APIs still require a current backend-only secret key. Internal SQL helpers have no browser execute grants.

Errors use `{ "error": "safe message", "code": "MACHINE_CODE" }`.

| HTTP status | Meaning and frontend handling |
| --- | --- |
| `400` | Malformed input; do not mutate state |
| `401` | Invalid/expired authentication; clear the local real session and ask for sign-in |
| `403` | Wrong role, invitation email mismatch or record ownership failure |
| `404` | Missing/inaccessible record or invalid public code |
| `409` | Conflicting or already processed transition; frontend refreshes current state |
| `410` | Expired/revoked invitation or connection link |
| `429` | Rate-limited; ask user to wait |
| `500` / `503` | Service error/unavailable; retain input and offer retry |

Use stable codes such as `INVITATION_EMAIL_MISMATCH`, `INVITATION_EXPIRED`,
`INVITATION_REVOKED`, `INVITATION_USED`, `CONNECTION_NOT_PENDING` and
`CONNECTION_CODE_REVOKED` as appropriate. The frontend currently displays safe
status-based messages and retains the code for future specific copy. Never put
SQL details, credentials, tokens or clinical information in errors. Malformed
success payloads are treated as failures, not as permission to enter a workspace.

## Platform admin API

Added by migration 007. Only accounts listed in `public.platform_admins` pass;
that table is written only by `postgres`/`service_role` (no API grants admin).
Same bearer header, JSON error shape and no secret key: the backend calls admin
RPCs with the user's JWT. Responses use `Cache-Control: no-store`. Full details,
onboarding and tests: [ADMIN_ONBOARDING.md](ADMIN_ONBOARDING.md).

| Method and endpoint | Access and body | Successful response |
| --- | --- | --- |
| `GET /admin/status` | Authenticated | `200 { "isAdmin": boolean }` |
| `GET /admin/doctor-invitations` | Admin | `200 { "invitations": AdminDoctorInvitation[] }` |
| `POST /admin/doctor-invitations` | Admin; `{ "email", "fullName", "specialty", "clinic" }` | `201 { "invitation": AdminDoctorInvitation, "link": string }`; link shown once, only its SHA-256 hash is stored |
| `POST /admin/doctor-invitations/:id/revoke` | Admin | `200 { "invitation": AdminDoctorInvitation }`; an accepted doctor keeps the role |

`AdminDoctorInvitation` has `id`, `email`, `fullName`, `specialty`, `clinic`,
`status` (`pending | accepted | expired | revoked`), `expiresAt`, `acceptedAt`
and `revokedAt`. Codes: `400 INVALID_INPUT`, `401 AUTH_REQUIRED`, `403 NOT_ADMIN`,
`404 NOT_FOUND`, `429 RATE_LIMITED`, `503 SERVICE_UNAVAILABLE`.

## Backend and database implementation requirements

### Identity and invitations

- Provision a default patient profile server-side for a verified first login;
  `/me` must return the durable profile. No client table writes or self-assigned
  role. Preserve the existing authenticated Supabase identity on promotion.
- A MedFlow operator checks professional eligibility outside the auth flow and
  generates an invitation for a precise email, either in the platform admin
  panel (`#/admin`, see "Platform admin API" and ADMIN_ONBOARDING.md) or with the
  trusted operator CLI. The admin right is separate from `profiles.role`; there
  is still no clinic-admin role.
- Generate cryptographically random tokens with 16–256 URL-safe characters
  (`A-Z`, `a-z`, `0-9`, `_`, `-`), with at least 128 bits of entropy. Store only
  token hashes, recipient identity/email, expiry, revocation and consumption
  metadata. Default expiry is seven days.
- Invite links use `${APP_ORIGIN}${APP_BASE_PATH}#/doctor/invite/{token}`. Return
  a raw link only at creation; exclude it from logs. The operator manually sends
  the link. The CLI and delivery are backend-team work and have not been run by
  this frontend implementation.
- Acceptance requires a validated session, verified Google email and matching
  invitation email. Compare canonical email addresses consistently; never use
  Gmail dot removal or plus-alias rewriting. Never trust an email supplied by
  the client. Never regard Google login alone as medical credential verification.
- Lock and validate the invitation and promote the profile in one transaction.
  Check expiry/revocation/previous consumption at transaction time. Store the
  consuming user ID. A retried successful acceptance by that same identity may
  return its verified doctor profile without consuming or issuing privileges
  again. Different identities cannot reuse it. Rollback on partial failure.
- Secret/service-role keys stay exclusively on the server. Existing medical
  tables have RLS and restricted grants; do not open them to browser writes to
  make this flow work. Check authorization before service-role operations.

### Doctor QR and requests

- Store a random, revocable connection code per verified doctor. It identifies
  an invitation to request association, never an auth session. QR content is
  `${APP_ORIGIN}${APP_BASE_PATH}#/connect/{code}`, with no patient/medical data.
  The canonical origin/base path comes from trusted server configuration.
- The public preview returns only the minimum professional identity. Apply
  rate limits and avoid exposing whether arbitrary private account IDs exist.
- Rotation atomically replaces the current code and invalidates the old link.
  Rotation must not cancel existing pending requests or active assignments.
- A scan/preview/login never creates a request. Require an explicit patient's
  confirmation and a current valid code. Persist a separate `pending` request.
- Protect against concurrent duplicate submissions with a database constraint
  and transaction. Return an existing pending request or active association
  idempotently. A rejected/cancelled request may be re-requested explicitly;
  do not mutate a terminal request implicitly during a GET or preview.
- `pending -> accepted` is a doctor-only transaction which also creates or
  reactivates exactly one `doctor_patient_assignments` row for that pair.
  `pending -> rejected` is doctor-only; `pending -> cancelled` is patient-only.
  Terminal transitions must not be reversed through this API. Repeating an
  already completed identical action may return its result idempotently.
- Do not activate an assignment on request creation or on patient login. Preserve
  the existing ability for one patient to have several active doctors. Accepting
  a request must not replace another doctor's assignment.
- Do not return success until persistence commits. The frontend keeps pending
  state and waits for the server's accepted result; no optimistic grant of access.

Use explicit CORS allowlists for development and deployed frontend origins, allow
the bearer/JSON headers required for preflight, and serve production over HTTPS.
CORS is not authorization. Configure server-side `APP_ORIGIN`/base path rather
than deriving links from an untrusted Host or Origin header. Do not log request
bodies containing invitation tokens or Authorization headers.

## Verification and rollout

Backend tests cover invalid/expired tokens, role/ownership checks, first-login
provisioning, existing-patient promotion, wrong invitation email, expiry,
revocation, same-user retry, cross-user replay, simultaneous acceptance and
duplicate connection submissions. Test rejection/cancellation, code rotation,
multiple active doctors and transactional rollback before enabling real access.

Frontend tests use mocked API/Supabase responses to verify callback/return
allowlists, cancelled login, missing configuration, expired session, malformed
responses, explicit-only connection creation, pending/accepted/rejected states,
refresh/retry and absence of demo fallback. Browser checks cover 320–1440 px,
Light/Dark, keyboard access and mobile camera opening the public HTTPS link.
These tests do not prove live Google setup, email delivery or database behavior.

Coordinate backend deployment and environment configuration before enabling
the real flow for users. Until the contract exists, show actionable configuration
or service errors. Preserve explicit demo routes separately. The API document
is the agreement to implement, not evidence that those services are live.
