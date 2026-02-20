from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import threading
import time
from PERSISTENT_AGENT_FRAMEWORK import PersistentEnsembleManager

app = FastAPI(title="Persistent Agent Service")

manager = PersistentEnsembleManager(storage_path="./ensemble_storage")
_monitor_thread = None


class TaskRequest(BaseModel):
    description: str
    priority: int = 1
    target_agent: str = "auto"


@app.get("/status")
def status():
    return manager.get_system_status()


@app.post("/tasks")
def add_task(req: TaskRequest):
    task_id = manager.add_task_to_queue(req.description, priority=req.priority, target_agent=req.target_agent)
    return {"task_id": task_id}


@app.post("/start-monitoring")
def start_monitoring():
    global _monitor_thread
    if _monitor_thread and _monitor_thread.is_alive():
        return {"status": "already_running"}

    def run():
        try:
            manager.run_continuous_monitoring()
        except Exception:
            pass

    _monitor_thread = threading.Thread(target=run, daemon=True)
    _monitor_thread.start()
    time.sleep(0.2)
    return {"status": "started"}


@app.post("/stop-monitoring")
def stop_monitoring():
    # Not implemented: the manager.run_continuous_monitoring loop reacts to KeyboardInterrupt only.
    # We'll inform the user to stop the process externally.
    raise HTTPException(status_code=501, detail="Stop not implemented; terminate process to stop monitoring")
