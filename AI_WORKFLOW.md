# AI Workflow Guardrails

## Canonical sources (read first)
- OpenAPI: ./openapi-spec.yaml (authoritative API contract)
- DB schema: backend/check-schema.ts output (or latest schema dump)
- Domain rules: PRD.md, SECURITY.md, README_GAP_FIXES.md, FRONTEND_API_EXPECTATIONS.md
- Active context log: ./AI_CONTEXT.md

## Rules of engagement
- No invention: if an API shape, column, or rule is not in the provided sources, stop and ask.
- Scope lock: only touch files explicitly listed by the request; ask before expanding scope.
- Minimal artifacts: produce code diffs and a short verification note; do not create or update docs unless explicitly asked.
- Consistency first: align UI ↔ API ↔ DB. Do not introduce new endpoints or schema without approval.

## Acceptance checklist (must pass)
- API requests/responses match openapi-spec.yaml for the endpoints touched.
- DB queries/migrations match actual schema (table/column names, constraints, types).
- UI and client models match API response/request shapes; no ad-hoc renames.
- Tests or targeted checks updated/executed when shapes change (component, API, or contract test).

## Standard task flow
1) Gather context: read AI_CONTEXT.md and relevant sections of openapi-spec.yaml and schema output.
2) Ask if required facts are missing; do not guess.
3) Plan minimal changes scoped to requested files.
4) Edit with small, justified diffs (prefer apply_patch).
5) Verify: run or outline the smallest relevant test/check; note results.
6) Update AI_CONTEXT.md: record new facts, decisions, and changes made.

## Output format per task
- Changes: brief description + affected files.
- Verification: what was checked/tested (or what to run).
- No additional markdown/docs unless explicitly requested.
