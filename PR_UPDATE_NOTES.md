````markdown
PR Update: feature/ensemble-roadmap — agent endpoints, DB persistence & connector
==========================================================================

Summary
-------
- Added agent endpoints to `api.py`: `/agents`, `/agents/{id}`, `/agents/{id}/register`, `/agents/{id}/receive`, `/agents/{id}/messages`, and `/messages`.
- Replaced the REST connector with a cleaned, DB-aware `tools/ai_connector_framework.py` (uses REST by default).
- Switched persistence from a JSON-lines log to SQLite (`agent_messages.db`) in the API; messages and registry entries are stored durably.

Test notes (current)
--------------------
- Default API port changed to `8100` to avoid conflicts in the local environment.
- I started the API on `http://127.0.0.1:8100`, ran the cleaned connector demo, and verified end-to-end persistence.
  - Connector registered three agents and sent three messages.
  - Verified via API that each agent had one persisted message (checked `/agents/{id}/messages`).

Files changed / added
---------------------
- `api.py` — added SQLite-backed persistence and agent endpoints
- `tools/ai_connector_framework.py` — cleaned DB-aware connector and demo (default base_url -> `http://localhost:8100`)
- `PR_UPDATE_NOTES.md` — this file (updated with current run notes)

How to reproduce locally
------------------------
1. Activate the Python 3.12 venv used by this workspace (`.venv-py312`).
2. Start the API (example):

```bash
cd C:\workspace
.venv-py312\Scripts\python -m uvicorn api:app --host 0.0.0.0 --port 8100
```

3. In another terminal run the connector demo:

```bash
.venv-py312\Scripts\python tools\ai_connector_framework.py
```

4. Verify persisted data (SQLite):

```bash
.venv-py312\Scripts\python - <<"PY"
import sqlite3
db = sqlite3.connect('agent_messages.db')
print('messages:', db.execute('SELECT count(*) FROM agent_messages').fetchone())
print('registry:', db.execute('SELECT count(*) FROM agent_registry').fetchone())
db.close()
PY
```

Notes
-----
- I committed and pushed these changes to branch `feature/ensemble-roadmap`.
- The PR (https://github.com/vortsghost2025/Deliberate-AI-Ensemble/pull/3) can be updated with this summary.
- I can update the GitHub PR body automatically if you provide a GitHub token with `repo` permissions; otherwise I will paste the suggested PR body here for you to copy.

-- Automated assistant

````