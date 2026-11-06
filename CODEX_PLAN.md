# Codex implementation plan — patient UI and primary integration

> Current allocation: `WORK_ALLOCATION.md` supersedes the historical ownership
> below. Claude handles most coding; Codex handles connected services and focused
> integration. The real authentication/QR contract is in `AUTH_INTEGRATION.md`.
> The patient chat described below now lives at `#/demo/patient`. The default
> patient route uses Google authentication and server-verified account data.

## Current handoff status

Patient chat, fluid layout, theme controls, sample suggestion panel and route
shell are implemented. Build/lint pass. Browser checks passed across the six
planned widths in Light/Dark, with Escape/focus restoration, message retention,
landscape, 200% text enlargement, system theme changes and hash navigation.
Screenshots are local under output/playwright. Doctor integration remains pending
Claude's index.ts export and HANDOFF.md; the optional module hook is prepared.
No backend or medical-data services were connected.

## Scope and ownership

Codex is primary. Claude independently owns `Frontend/src/features/doctor/**`;
do not edit that folder while Claude works. Read AGENTS.md and inspect existing
modules first. Implement UI with synthetic data and local interactions only.
Do not change Backend, Database, AI, Supabase access or backend API contracts.
No dependencies or credentials added. No real diagnosis, prescribing, uploads,
OS notifications or authentication in this round.

Reference images live in ignored `Frontend/figma-references/`. Use 04/06 for chat,
05/07 for doctor suggestion, 25/26 for foundations. Reproduce product screens,
excluding Figma chrome. Keep reference screenshots outside the bundle.

## Parallel assignments (exclusive writes)

1. Chat agent: `Frontend/src/features/chat/**` only. Inspect existing chat, improve
   reference alignment and accessibility, preserve pending/error/retry safeguards.
   Do not touch global CSS; provide requested CSS hooks in its handoff message.
   Add optional ChatPage `onOpenSuggestion?: () => void` and
   `suggestionOpen?: boolean` props for primary integration. Add an accessible
   Care team / Doctor suggestion demo entry when the callback is supplied.
2. Suggestion agent: `Frontend/src/features/patient-suggestions/**` only. Export
   PatientSuggestionPanel and the interfaces below from index.ts; import own
   scoped CSS. No network, chat imports or global styles. Use existing tokens.
3. Codex primary: all shared files, navigation, styles, brand, mock copy,
   documentation, integration and verification. Do not edit agent folders until
   their agents finish. Own root plan documents. Do not run git mutations during
   parallel work; commit only named, reviewed files after agents stop.

```tsx
export interface PatientSuggestion {
  id: string;
  doctorName: string;
  text: string;
  createdAt: string;
}
export interface PatientSuggestionPanelProps {
  suggestion: PatientSuggestion;
  onClose: () => void;
}
```

Suggestion panel: desktop side panel; mobile dedicated overlay/dialog, accessible
close/Escape, manage focus and restore trigger, demo label. Keep doctor content
separate from AI. Use patient-suggestion-prefixed classes, no global selectors.
Primary conditionally mounts it and preserves ChatPage while toggling the panel.

## Primary implementation

- Preserve Light/Dark/System and existing public token names for Claude. Align
  shared spacing, borders, button states and typography to white-label rules.
  Keep clinical status colors separate from brand. Existing logos are placeholders.
- Layout is fluid: %, fr, minmax(), rem, clamp(), readable max-widths, min-width:0,
  wrapped controls, no fixed page/form dimensions. Use 100dvh/safe-area support;
  allow scroll when keyboard/zoom reduces available height. Verify 320/360/390/
  768/1024/1440 px, landscape and 200% zoom. Touch controls target 44 CSS px.
- Integrate patient suggestion with local synthetic fixture; visible demo labels,
  no actual delivery or system popup. Preserve chat text/state when panel closes.
- Routes: #/patient default, #/doctor doctor area. Hash navigation supports browser
  back/forward. A labelled demo navigation link lets the user switch areas. Keep
  a single ThemeProvider. Patient header must not wrap doctor layout.
- Until Claude delivers, #/doctor displays an honest in-progress page with return
  navigation. Do not create a duplicate doctor module. After handoff, import the
  agreed DoctorApp export; primary may use an eager glob for the exact export file
  during independent development so its absence does not break patient builds.
- Remove mock claims that messages were recorded or actually sent to a care team.
  Clearly state local demo data is not persisted and reload discards conversation.
- Update Frontend README to cover routes, demo interactions, responsive checks,
  placeholder assets, local-only services and remaining backend integration.

## Acceptance

Build and lint pass. No unwanted horizontal overflow across tested sizes. Both
themes and system preference work. Test keyboard navigation, focus, long text,
empty/loading/error chat, pending send guard, error/retry without lost or duplicate
patient messages. Suggested doctor content is separately labelled and accessible.
No reference screenshots bundled; no network calls for demo forms or medical data.
Use browser automation when available to verify layout and interactions, recording
screenshots locally in ignored artifacts. Report unavailable checks honestly.

## Execution sequence and commits

Checkpoint existing work first (Frontend then superproject pointer/config changes).
Create both root MD files, then start the two Codex agents while primary handles
shared integration. User independently starts Claude with CLAUDE_PLAN.md. Finish
patient scope without waiting indefinitely for Claude; report doctor integration
pending until its export/handoff exists. Commit only this team's reviewed files,
then update superproject pointer and plans. No push requested.
