# Minimal Schema Migrations Strategy

Goal: make bootstrap safe and deterministic without a full framework.

## Table

Create a single tracking table:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checksum TEXT NOT NULL
);
```

## Execution Rules

- Acquire a global advisory lock to avoid concurrent migrations.
- Run migrations in order inside a single transaction per migration file.
- Record `version` and `checksum` only after successful commit.
- Refuse to run if an applied version has a different checksum.

## Suggested Flow

1. Read migration files from `backend/src/database/migrations/`.
2. Sort by version prefix (e.g., `019_add_platform_admin.sql`).
3. For each file:
   - If `version` exists, skip.
   - Else run in a transaction and insert into `schema_migrations`.

## Example Pseudocode

```ts
await pool.query('SELECT pg_advisory_lock(4242)');
try {
  for (const migration of migrations) {
    if (await isApplied(migration.version)) {
      await assertChecksum(migration);
      continue;
    }
    await pool.query('BEGIN');
    await pool.query(migration.sql);
    await pool.query(
      'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
      [migration.version, migration.checksum]
    );
    await pool.query('COMMIT');
  }
} catch (error) {
  await pool.query('ROLLBACK');
  throw error;
} finally {
  await pool.query('SELECT pg_advisory_unlock(4242)');
}
```

## Minimal Guardrails

- Only run migrations when `RUN_MIGRATIONS=true`.
- Only allow destructive SQL when `ALLOW_DB_RESET=true`.
- Log the migration plan before execution.
