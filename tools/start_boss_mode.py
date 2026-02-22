"""Start boss-mode monitoring for the Persistent Ensemble Manager.

This script launches the `PersistentEnsembleManager.run_continuous_monitoring`
loop as a standalone process. Run it from the project venv to isolate memory.
"""
import logging
import sys
import os
import time

# Ensure the workspace root is on sys.path so imports like
# `from PERSISTENT_AGENT_FRAMEWORK import PersistentEnsembleManager`
# work when the script is launched from `tools/`.
script_dir = os.path.dirname(os.path.abspath(__file__))
workspace_root = os.path.abspath(os.path.join(script_dir, os.pardir))
if workspace_root not in sys.path:
    sys.path.insert(0, workspace_root)

try:
    from PERSISTENT_AGENT_FRAMEWORK import PersistentEnsembleManager
except Exception as e:
    logging.exception("Failed to import PersistentEnsembleManager: %s", e)
    sys.exit(2)


def main():
    logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")
    logging.info("Starting Persistent Ensemble Manager (boss mode)")

    manager = PersistentEnsembleManager()

    try:
        manager.run_continuous_monitoring()
    except KeyboardInterrupt:
        logging.info("Received KeyboardInterrupt, stopping monitoring")
    except Exception:
        logging.exception("Monitoring loop exited with error")
    finally:
        logging.info("Boss-mode monitoring stopped")


if __name__ == "__main__":
    main()
