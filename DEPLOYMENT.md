# Deployment

This document summarizes deployment practices for the FreeAgent ecosystem. **No secrets or credentials are stored in this repository.**

## Deployed Components

- **FreeAgent runtime/orchestration** — local or server execution (e.g., `live_trading.py`, `orchestrator/`).
- **WE4Free public site** — static PWA deployed to Hostinger (and optionally GitHub Pages for country builds).
- **Shared infrastructure** — CI, scripts, utilities (see `shared-infra/` repo).
- **Federation‑creative** — static simulations and weather server (see `federation-creative/` repo).
- **Connection‑bridge** — Netlify serverless functions (see `connection-bridge/` repo).

## Deployment Methods

### FreeAgent Runtime

- Run locally or on a VPS using the provided entry points (`main.py`, `continuous_trading.py`, etc.).
- Ensure environment variables are set via a secure secrets manager (not in repository).
- Use process managers (e.g., systemd, Docker) as appropriate.

### WE4Free Public Site

- Deployed via `deploy_website.ps1` to Hostinger (SSH credentials stored in secrets manager).
- Country‑specific builds use `we4free_global/build.js` and are deployed to GitHub Pages (or Hostinger) as static PWAs.

### Shared / Extracted Repos

- `shared-infra`, `federation-creative`, `connection-bridge` are deployed independently per their own READMEs.
- No runtime dependency on FreeAgent core for these repos.

## Security

- Never commit `.env`, `.env.local`, or credential files.
- Rotate credentials regularly and store them in a secrets manager.
- Use least‑privilege access for deployment credentials.

## Rollback

- Keep previous deployment artifacts or Git tags to enable quick rollback.
- For WE4Free site, revert to prior commit and redeploy.
- For FreeAgent runtime, revert code and restart services.

## Monitoring

- Basic health checks should be implemented for long‑running services.
- Logging should be centralized where possible.
- See MONITORING.md (if created) for additional guidance.

--

*This document is intentionally high‑level. Detailed deployment steps are in component READMEs and deployment scripts.*

*Last updated: 2026-04-28*