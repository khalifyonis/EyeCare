# Scripts Policy

This folder contains operational scripts that are reused and safe for regular developer workflows.

## Keep Criteria
- Reused across incidents or onboarding.
- Operationally important.
- Guarded if destructive.
- Documented with usage examples.

## Scripts
- `kill-ports.js`: Frees dev ports and clears stale Next.js lock.

### kill-ports.js
Purpose: free local ports used by this system (`3000`, `3001`, `5000`).

Safety:
- Requires explicit confirmation: `--yes` or env `ALLOW_KILL_PORTS=1`.
- Optional custom ports via `--ports=3000,5000`.

Usage examples:
- `node scripts/kill-ports.js --yes`
- `node scripts/kill-ports.js --ports=3000,5000 --yes`
