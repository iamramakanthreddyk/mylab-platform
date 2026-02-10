# Database Migrations

This folder contains versioned SQL migrations executed by the bootstrap runner when `RUN_MIGRATIONS=true`.

## Naming

- Use a zero-padded numeric prefix, then a short description.
- Format: `NNN_description.sql`.
- Example: `019_add_platform_admin_role.sql`.

## Execution Rules

- Migrations run in lexical order by filename.
- Each file runs inside its own transaction.
- Applied migrations are recorded in `schema_migrations` with a checksum.
- If a file changes after being applied, the runner fails with a checksum mismatch.

## Guardrails

- Avoid destructive changes unless explicitly approved.
- Use `IF EXISTS`/`IF NOT EXISTS` where possible for idempotency.
- Keep migrations small and focused on a single change.
