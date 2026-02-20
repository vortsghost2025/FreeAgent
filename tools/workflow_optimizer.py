"""
WORKFLOW_OPTIMIZER.PY
Enhanced Workflow Optimization System for Rapid Development

Provides a small helper to create and track tasks assigned to ensemble agents.
"""

import uuid
from datetime import datetime
from typing import Dict, List, Any


class WorkflowOptimizer:
    """Optimizes development workflow by creating seamless agent coordination"""

    def __init__(self):
        self.tasks: List[Dict[str, Any]] = []
        self.agent_communication: Dict[str, List[str]] = {}

        # Initialize with default agents
        self.agents = {
            "lingma": {"type": "research", "status": "idle"},
            "claude_code": {"type": "coding", "status": "idle"},
            "gpt_codex": {"type": "verification", "status": "idle"}
        }

        print("🚀 Workflow Optimizer initialized")

    def create_task(self, task_name: str, description: str,
                    priority: str = "normal") -> str:
        """Create a new task with automatic agent assignment"""
        task_id = f"task_{uuid.uuid4()}"

        # Assign tasks based on type
        desc = description.lower()
        if "research" in desc:
            assigned_agent = "lingma"
        elif "code" in desc or "implementation" in desc:
            assigned_agent = "claude_code"
        else:
            assigned_agent = "gpt_codex"

        task = {
            "id": task_id,
            "name": task_name,
            "description": description,
            "priority": priority,
            "assigned_to": assigned_agent,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "completed_at": None,
        }

        self.tasks.append(task)
        print(f"📝 Created task: {task_name} (assigned to {assigned_agent})")

        return task_id

    def assign_task_to_agent(self, task_id: str, agent_id: str):
        """Assign a task to a specific agent"""
        task = next((t for t in self.tasks if t["id"] == task_id), None)
        if not task:
            raise ValueError(f"Task {task_id} not found")

        task["assigned_to"] = agent_id
        task["status"] = "assigned"
        print(f"🎯 Assigned task {task_id} to {agent_id}")

    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Get status of a specific task"""
        task = next((t for t in self.tasks if t["id"] == task_id), None)
        if not task:
            raise ValueError(f"Task {task_id} not found")

        return task

    def complete_task(self, task_id: str):
        """Mark a task as completed"""
        task = next((t for t in self.tasks if t["id"] == task_id), None)
        if not task:
            raise ValueError(f"Task {task_id} not found")

        task["status"] = "completed"
        task["completed_at"] = datetime.now().isoformat()
        print(f"✅ Completed task: {task['name']}")


def demo():
    wo = WorkflowOptimizer()
    tid = wo.create_task("Initial research", "Research the best numpy pins for Windows builds", "high")
    print(wo.get_task_status(tid))
    wo.assign_task_to_agent(tid, "lingma")
    wo.complete_task(tid)
    print(wo.get_task_status(tid))


if __name__ == "__main__":
    demo()
