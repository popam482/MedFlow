# MedFlow platform admin: inviting doctors

Audience: the MedFlow team and Codex. Related contract: [AUTH_INTEGRATION.md](AUTH_INTEGRATION.md).
Operator CLI alternative: [Backend/AUTH_SETUP.md](Backend/AUTH_SETUP.md) (`npm run invite:doctor`).

## 1. What it is and why

A platform administrator can create, list and revoke doctor invitations from the
web app at `#/admin`, instead of running the operator CLI.

- The admin right lives only in `public.platform_admins` (migration 007). It is
  separate from `profiles.role`, which stays `patient | doctor` and is unchanged.
  Being an admin does not make an account a doctor, and vice versa.
- Doctors still get their role only by accepting an invitation while signed in
  with the invited Google email (unchanged 004 acceptance rules).
- Nobody can become admin through the API. `platform_admins` has forced RLS and no
  grants for `anon`/`authenticated`; no database function writes it. Only
  `postgres`/`service_role` can insert rows.

## 2. One-time admin onboarding (Codex/operator only)

Grant admin **only** to the single account the project owner explicitly names.
Agents must never grant admin to any other account (including their own test
accounts or fixtures). There is no API or UI to grant admin.

1. The named person signs in once with Google in the app, so `/me` provisions
   their profile (`platform_admins.user_id` references `public.profiles`).
2. As `postgres`/`service_role` in the Supabase SQL editor:

   ```sql
   insert into public.platform_admins(user_id)
   select id from auth.users
   where lower(email) = lower('<admin email given by the owner>');
   ```

   Check that exactly one row was inserted. Zero rows means the account has not
   signed in yet (or the email differs).
3. The person reloads `#/admin`; the panel replaces "Access restricted".

To remove the right:

```sql
delete from public.platform_admins
where user_id = (select id from auth.users where lower(email) = lower('<admin email>'));
```

Removing admin does not change the account's `profiles.role` or any invitation
already created.

## 3. Applying the migration

- Prerequisite: 004-006 applied.
- Codex applies `Database/migrations/007_platform_admins.sql` as the migration
  owner (`postgres`) after review.
- Then runs `Database/migrations/verify_007_checks.sql` as `postgres`. It uses only
  synthetic rows and ends with `ROLLBACK`; success prints the NOTICE
  `verify_007_checks: all checks passed`. Any other result is an exception.
- The verification covers: forced RLS and no browser grants on the table, anon
  cannot execute the admin RPCs, private helpers are not exposed, no function
  writes `platform_admins`, `AUTH_REQUIRED`/`NOT_ADMIN` for direct RPC calls,
  admin create/list/revoke, no token hash in responses, `profiles.role` unchanged.

## 4. Flow

1. Admin opens `#/admin` (protected by `AuthBoundary`; `/admin` is an allowed
   post-login destination). A non-admin sees "Access restricted"; a signed-out
   user is sent to sign in first.
2. Admin fills email, full name, specialty and clinic and creates the invitation.
3. The one-time link is shown with **Copy link** and **Done**. After Done (or a
   reload) it cannot be shown again; create a new invitation if it is lost.
4. Admin sends the link to the doctor manually (MedFlow sends no email).
5. The doctor opens `#/doctor/invite/{token}`, signs in with the invited Google
   email and explicitly accepts; the profile becomes `doctor` and opens `#/doctor`.
6. The list shows each invitation's status: `pending`, `accepted`, `expired`,
   `revoked` (latest 200, by expiry). Revoke is two-step (confirm / keep).
   Revoking blocks an unused link; it does **not** remove the role of a doctor who
   already accepted. Revoking an invitation also hides its link if still shown.

## 5. API contract

Paths are relative to `VITE_API_BASE_URL`. All endpoints require
`Authorization: Bearer <Supabase access token>` and respond with
`Cache-Control: no-store`.

```ts
type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

interface AdminDoctorInvitation {
  id: string;
  email: string; // stored as lower(trim(email))
  fullName: string;
  specialty: string;
  clinic: string;
  status: InvitationStatus;
  expiresAt: string;         // ISO 8601
  acceptedAt: string | null;
  revokedAt: string | null;
}
```

| Method and endpoint | Access and body | Successful response |
| --- | --- | --- |
| `GET /admin/status` | Authenticated | `200 { "isAdmin": boolean }` |
| `GET /admin/doctor-invitations` | Admin | `200 { "invitations": AdminDoctorInvitation[] }` |
| `POST /admin/doctor-invitations` | Admin; `{ "email", "fullName", "specialty", "clinic" }` (strict, trimmed; email max 320, name/specialty max 200, clinic max 300) | `201 { "invitation": AdminDoctorInvitation, "link": string }` |
| `POST /admin/doctor-invitations/:id/revoke` | Admin; `:id` is a UUID | `200 { "invitation": AdminDoctorInvitation }` |

Errors use `{ "error": "safe message", "code": "MACHINE_CODE" }`:

| Status | Code | Meaning |
| --- | --- | --- |
| `400` | `INVALID_INPUT` | Malformed body or id |
| `401` | `AUTH_REQUIRED` | Missing/invalid/expired token |
| `403` | `NOT_ADMIN` | Signed in, but not in `platform_admins` |
| `404` | `NOT_FOUND` | Unknown invitation id |
| `429` | `RATE_LIMITED` | Too many requests; `Retry-After` header is set |
| `503` | `SERVICE_UNAVAILABLE` | Database/config error or unexpected response |

Backend: `Backend/src/admin/index.ts`, mounted in `Backend/src/index.ts`.
Database: `Database/migrations/007_platform_admins.sql`.
Frontend: `Frontend/src/features/admin/**`, route in `App.tsx`, allowlist in
`src/auth/navigation.ts`.

## 6. Security notes

- **Link shown once.** The raw token (32 random bytes, base64url) exists only in
  the `201` response. Only its SHA-256 hash is stored; list/revoke responses never
  contain the token, hash or `consumed_by`. The link is not logged, and the
  frontend keeps it in memory only (never in storage or the URL).
- **No secret key at runtime.** The router verifies the user's JWT and calls the
  admin RPCs with that same JWT. Each RPC checks the admin right itself via
  `auth.uid()`, so calling the RPCs directly gives the same protection.
- **anon has no access** to the table or any admin RPC; `authenticated` can execute
  only the four admin RPCs, and they refuse non-admins with `NOT_ADMIN`.
- **Rate limits** (per client IP, per minute, in memory): 120 requests for all
  admin routes, plus 20 for invitation creation.
- **Account switching.** Link, list and admin status are cleared immediately on
  logout or account switch; late responses from the previous account are dropped.
- Invitation creation reuses 004's validation (email format, 7-day expiry).
  A failed or lost create response reloads the list, so a created invitation is
  visible; its link is not recoverable.
- Use synthetic data only for development and tests.

## 7. Tests

Backend (`Backend/`):

```sh
npm run test:admin
npm run test:account
```

Frontend (`Frontend/`):

```sh
node --experimental-strip-types --no-warnings src/features/admin/adminLogic.test.ts
npm run build
npm run lint
```

Database: `verify_007_checks.sql` (section 3). A live check (admin -> invite ->
doctor accepts) is done by Codex after the migration and the admin grant.
