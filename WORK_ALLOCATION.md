# MedFlow: Claude implementation, Codex integration

Current user preference: send most coding work to Claude to conserve Codex usage.
This allocation supersedes historical ownership in the original implementation
plans. Existing in-progress file reservations remain until their handoff.

## Responsibilities

- Claude: inspect code, implement frontend and backend changes, write proposed SQL
  migrations, add relevant tests, run build/lint/tests and fix failures. Delegate
  independent tasks to Claude agents with exclusive file ownership when useful.
- Codex: communicate with Supabase and other connected services, inspect deployed
  schema/configuration, review and apply necessary migrations, check API contracts
  and perform focused integration review of Claude's delivered changes.
- Codex writes application code only for a small integration fix or an explicit
  user request. Larger fixes go back to Claude with precise acceptance criteria.
- Existing AI work by colleagues remains theirs unless explicitly reassigned.

## Working loop

1. Claude reads applicable AGENTS.md, AUTH_INTEGRATION.md and the relevant modules.
   For the current patient connection task, finish CLAUDE_NEXT_TASK.md first;
   this document does not enlarge that task's exclusive file scope.
2. For the next task, define the outcome, allowed files, fixed API contract and
   acceptance checks before parallel edits. Reserve shared files explicitly.
3. Claude implements and verifies locally. For database changes, provide a new
   migration and verification SQL for Codex; never rewrite applied migrations.
4. Claude hands off changed files, test commands/results, proposed migrations and
   concrete blockers. Do not include credentials, JWTs or real patient data.
5. Codex reviews the relevant diff and contracts, performs necessary connected
   service operations, and runs only integration checks justified by the change.
   Avoid duplicating Claude's implementation or rerunning passed checks without
   a change, failure or unresolved concern.

## Boundaries

Keep one Supabase client/auth provider and backend-verified roles. Use synthetic
data. Never expose server secrets in frontend code or handoffs. Do not replace
real errors with demo success. Preserve unrelated changes and coordinate Git
operations; no concurrent checkout, staging, commits or resets.

## Prompt to give Claude

Read WORK_ALLOCATION.md and applicable AGENTS.md. You are the main implementation
agent; Codex handles Supabase/connected services and final integration review.
Finish the current CLAUDE_NEXT_TASK.md within its file scope and deliver its
HANDOFF.md. If already complete, report the handoff and propose the next concrete
implementation task with exact file ownership and acceptance checks. Do not start
an unrelated feature or expand ownership implicitly. Implement, test and fix
within the assigned scope using your own agents where useful. Send Codex only
the concise handoff, contract questions and operations requiring connected service
access; do not ask Codex to duplicate your coding or local test work.
