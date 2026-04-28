# Security Policy

## Responsible Disclosure

If you discover a security vulnerability, please report it to the maintainers immediately so we can address it before it is disclosed publicly.

**Do not** create a public GitHub issue for security vulnerabilities.

## How to Report

- Email: (to be specified by project maintainers)
- Or use GitHub's private vulnerability reporting feature if available.

Include in your report:
- A description of the vulnerability.
- Steps to reproduce (if possible).
- The potential impact.
- Any suggested fixes or mitigations.

## Response Process

- We will acknowledge receipt of your report within 48 hours.
- We will provide regular updates on the investigation and remediation.
- After a fix is released, we will coordinate public disclosure with the reporter.

## Scope

This policy applies to all repositories under the FreeAgent and Deliberate-AI-Ensemble organizations, including related services and deployment infrastructure.

## Existing Security Practices

- Secrets are not stored in the repository (see `.env.template` for placeholders only).
- High‑entropy strings are regularly scanned for accidental commits.
- Deployment credentials are stored outside the repository (e.g., secrets manager, CI environment).

## Security Updates

We will publish security updates in accordance with the project's release process, and provide guidance for upgrading or mitigating risks.

--

*Last updated: 2026-04-28*