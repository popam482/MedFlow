# Claude implementation plan — doctor UI

## Mission and collaboration

Implement the doctor UI while Codex implements patient UI and owns integration.
Read root and Frontend AGENTS.md first. Frontend is a Git submodule. Preserve all
existing work. Only synthetic data and local interactions in this phase; backend,
Database and AI are owned by colleagues and must not be changed.

**Exclusive write ownership: `Frontend/src/features/doctor/**`.** Everything else
is read-only, including App.tsx, shared styles, brand, theme, package files and
this document. Do not install dependencies or perform git staging, commits,
checkout, reset, clean or stashing. Other agents share this working directory.
Request shared changes in HANDOFF.md; Codex will implement them.

## References and appearance

Read local images in `Frontend/figma-references/medflow-figma-details/`:
01–03 desktop Light, 08–10 desktop Dark, 11–24 mobile, 25–26 foundations.
Read consecutive mobile captures as one screen. Reproduce MedFlow only, not Figma
toolbars, banners, neighboring frames or the zoom scale. Images remain ignored
by Git and must never be imported into the runtime application.

Use a fluid responsive UI: %, fr, minmax(), min()/max(), rem and clamp(). Set
max-width for readable forms; avoid fixed page/form sizes. Stack desktop columns
on mobile, replace desktop patient tables with cards, and wrap actions. Support
320/360/390/768/1024/1440 px, landscape and 200% zoom without unwanted horizontal
scroll. Controls retain accessible minimum sizes (44 CSS px where practical).
Use 100dvh when necessary with content scrolling and safe-area insets, not fixed
heights that clip forms or virtual-keyboard content.

Consume existing semantic CSS variables without renaming them. Read-only imports
of BrandMark and ThemeSelector are allowed. Use a `doctor-` prefix for every CSS
class and scope element selectors under the module root. No global element,
:root, body or theme overrides. Add new status variables locally to the module
with Light/Dark overrides; clinical status colors are independent of branding.
Use English UI copy from references. Preserve placeholder brand assets until
originals are supplied. Add no new ThemeProvider.

## Integration contract (fixed)

Export DoctorApp and DoctorAppProps from `Frontend/src/features/doctor/index.ts`:

```tsx
export interface DoctorAppProps { onExit: () => void }
export function DoctorApp(props: DoctorAppProps): React.JSX.Element;
```

DoctorApp starts on login and manages internal login/register/workspace state.
onExit returns to the patient area. Logout clears demo-session state and returns
to doctor login. Codex owns #/patient and #/doctor routes and the outer provider.
The module imports its own scoped CSS and does not rely on patient CSS classes.

## Deliverables

1. Desktop split-panel login and mobile login. Validate required fields and email;
   mask password. Login enters a clearly labelled demo workspace, never claims
   real authentication. Forgot-password opens an explicit not-connected message.
2. Registration: full name, work email, phone, specialty, medical registration
   number, institution, password, confirmation, credential file. Local validation
   including matching passwords. Accept PDF/JPG/PNG up to 10 MB; show name/remove.
   Never upload, persist documents or passwords, or log their content. Submission
   shows demo pending verification; never self-approve or claim server success.
3. Workspace with eight synthetic patients from reference copy. Calculate counts,
   search name/ID case-insensitively, filter statuses, sort by activity using real
   timestamps (not string labels). Desktop table; mobile summary and patient-card
   panel. Include no-results, loading and error previews using local demo controls.
4. View patient: local synthetic summary. Add patient: explicit not-connected
   explanation of future QR/invitation flow, no fake persisted assignment.
5. Doctor suggestion dialog: message, optional local JPG/PNG photo, preview/remove,
   validation, sending and error demo states. Revoke object URLs. Confirmation
   explicitly says no suggestion was transmitted. This does not send data to the
   patient module. Do not generate medical advice or diagnosis.
6. Messages/Documents/Settings: navigable not-connected panels rather than dead
   buttons. Settings may include existing ThemeSelector. No fake remote records.

## Parallel agent assignment

Freeze internal interfaces first, then delegate exclusive folders:
- Agent A: doctor/auth/** — login and registration.
- Agent B: doctor/workspace/** — patients, filters, cards and table.
- Agent C: doctor/suggestions/** — suggestion dialog.
- Claude coordinator: module root, shared types/fixtures and integration.

Do not let agents edit each other's files. Use existing React/TypeScript and CSS.
Do not over-engineer service/API contracts before the backend team discussion.

## Verification and handoff

Run `npm.cmd run build` and `npm.cmd run lint` from Frontend (no --fix). Report
failures outside ownership instead of changing those files. Verify both themes,
viewport sizes above, keyboard focus, accessible labels/errors, dialog Escape,
focus containment/restoration, file validation and no network upload. Add focused
tests for nontrivial patient filtering/sorting and registration validation using
available tools, without introducing a new test framework.

Write `doctor/HANDOFF.md` with files delivered, commands/results, visual checks,
remaining limitations and requested shared changes. Mark module ready only when
the public export builds. Codex performs final cross-module integration.
