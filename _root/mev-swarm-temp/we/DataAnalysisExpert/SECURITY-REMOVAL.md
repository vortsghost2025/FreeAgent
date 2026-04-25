# REMOVED: sensitive data redacted by automated security cleanup
Security Removal & Key Rotation Guide

Goal: remove the exposed private key from the repository, rotate credentials, and verify repository is clean.

IMPORTANT: Do NOT perform force-pushes to shared remotes unless you have coordination with repo owners and all collaborators. Take a mirror backup before history rewrite.

1) Immediate (manual) actions
- Rotate the compromised private key NOW: transfer any funds out of the compromised wallet to a newly-generated wallet under your control.
- Revoke or rotate any other credentials that may be related (API keys, exchange API, third-party services).

2) Make working-tree fixes (already done locally)
- Replace sensitive values with placeholders in working files (done): update `.env` to `PRIVATE_KEY=REDACTED_SET_VIA_SECRET_MANAGER

Suggested commands to commit safe replacements on a new branch:
```bash
git checkout -b security/remove-exposed-env
git add .gitignore .env
git commit -m "security: remove exposed private key and ignore .env"
git push origin HEAD
```

3) Verify where the secret appears in history
- To search full history for the secret (replace the hex prefix if needed):
```bash
git log --all -S 'REDACTED_HEX_64'
# or search by file path occurrences
git grep -n "PRIVATE_KEY=REDACTED_SET_VIA_SECRET_MANAGER
```

4) Recommended history purge options (pick one)

A) git-filter-repo (recommended)
- Install: `pip install git-filter-repo`
- Backup: `git clone --mirror <repo_url> repo-mirror.git`
- Remove the file path `.env` entirely from history (mirror repo):
```bash
cd repo-mirror.git
git filter-repo --invert-paths --paths .env
```
- OR remove by replacing the secret string (create a replacements file):
Create `replacements.txt` with a single line:
```
REDACTED_HEX_64==>REDACTED_PRIVATE_KEY
```
Then:
```bash
git filter-repo --replace-text replacements.txt
```
- Push cleaned mirror back to origin (force):
```bash
git push --force --all
git push --force --tags
```

B) BFG Repo-Cleaner (simpler wrapper)
- Download BFG jar: https://rtyley.github.io/bfg-repo-cleaner/
- Mirror backup: `git clone --mirror <repo_url> repo.git`
- Remove file(s):
```bash
java -jar bfg.jar --delete-files .env repo.git
```
- OR replace passwords/strings using `--replace-text passwords.txt`.
- After BFG run, follow with:
```bash
cd repo.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

5) Post-rewrite tasks
- Notify collaborators about the force-push and ask them to re-clone or run the supplied recovery steps.
- Rotate any credentials again if there's a chance they were copied elsewhere.

6) Re-scan repository and regenerate baselines
- Run detect-secrets and gitleaks in working tree and update baselines.
```bash
# detect-secrets
detect-secrets scan > .secrets.baseline
# gitleaks
gitleaks detect --source . --report-path .gitleaks-report.json
```
- Review results; if any leaks remain, repeat removal process until clean.

7) Prevent recurrence
- Add `.env` and `*.env*` to `.gitignore` (done).
- Add pre-commit hooks to block secrets (detect-secrets-hook or detect-secrets pre-commit integration).
- Add CI-based secret scanning (run detect-secrets/gitleaks in PR checks).

8) Verification checklist
- [ ] Funds moved from compromised wallet
- [ ] `.env` cleaned and replaced with placeholder in working tree
- [ ] Git history purged of the secret (confirm `git log --all -S '<secret>'` returns no results)
- [ ] Force-push completed and collaborators informed
- [ ] Scans return clean

If you want, I can prepare a pull request with the `security/remove-exposed-env` branch, or prepare exact mirror/rewrite commands for your repository URL — but I will not run destructive history rewrite or force-push without your explicit consent and coordination.
