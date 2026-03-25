# Backend Scripts Policy

This folder contains backend operational scripts only.

## Keep Criteria
- Needed for real operations.
- Reused enough to justify maintenance.
- Clear inputs/outputs.
- Safety checks for risky actions.

## Scripts
- `find-users-db.mjs`: scan accessible databases and show where `public.users` exists.
- `reset-user-password.mjs`: reset one user's password with explicit confirmation.

### find-users-db.mjs
Purpose: identify which database contains users when environments differ.

Usage:
- `node scripts/find-users-db.mjs`

Requirements:
- `DATABASE_URL` or `PG*` environment variables.

### reset-user-password.mjs
Purpose: emergency password reset for support/operations.

Safety:
- Requires `--yes` confirmation.
- Requires explicit `--username` and `--password`.

Usage:
- `node scripts/reset-user-password.mjs --username=yonis --password=YourNewPass123 --yes`
