PR Update: feature/ensemble-roadmap — agent endpoints & AI connector
===============================================================

Summary
-------
- Added agent endpoints to `api.py`: `/agents`, `/agents/{id}`, `/agents/{id}/register`, `/agents/{id}/receive`.
- Added `tools/ai_connector_framework.py` (REST-first connector) to register agents and send messages.
- Added persistent logging for agent registration, send attempts, and received messages to `ensemble_storage/ai_connector_messages.log`.

Test notes
----------
- API launched on `http://127.0.0.1:8002` during testing.
- Ran `python tools/ai_connector_framework.py` successfully; connector registered three agents and delivered three messages to `/agents/{id}/receive` (all returned 200).
- The demo will fall back to a mock 'sent' response when the API is unreachable; such mock sends are also recorded in the log.

Files changed / added
---------------------
- `api.py` — added endpoints and receive logging
- `tools/ai_connector_framework.py` — new connector; persistent logging
- `PR_UPDATE_NOTES.md` — this file

How to reproduce locally
------------------------
1. Activate the Python 3.12 venv used by this workspace (`.venv-py312`).
2. Start the API (example):

```bash
cd c:\workspace
uvicorn api:app --host 0.0.0.0 --port 8002
```

3. In another terminal run the connector demo:

```bash
python tools/ai_connector_framework.py
```

4. Check the persistent log:

```bash
type ensemble_storage\ai_connector_messages.log
```

Notes
-----
- I pushed these changes to branch `feature/ensemble-roadmap`. The PR will update automatically.
- If you'd prefer the API on a different port (8000/8001), I can switch the default and update tests.

-- Automated assistant
