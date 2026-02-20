# TASK_QUEUE.PY - Distributed Async Task Queue for Mesh Federation
# Implements priority-based task processing with mesh network integration

import asyncio
import json
import uuid
from enum import Enum
from dataclasses import dataclass, asdict, field
from datetime import datetime
from typing import Dict, List, Any, Optional, Callable, Coroutine
from collections import deque
import heapq

class TaskStatus(Enum):
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"

class TaskType(Enum):
    FORTRESS_BUILD = "fortress_build"
    FORTRESS_REPAIR = "fortress_repair"
    FORTRESS_DEFEND = "fortress_defend"
    GAME_ACTION = "game_action"
    FEDERATION_SYNC = "federation_sync"
    MESH_DISCOVERY = "mesh_discovery"
    CONFLICT_RESOLVE = "conflict_resolve"
    STATE_PERSIST = "state_persist"
    HEALTH_RESOURCE = "health_resource"
    CUSTOM = "custom"

class TaskPriority(Enum):
    CRITICAL = 1      # Highest priority
    HIGH = 2
    NORMAL = 3
    LOW = 4
    BACKGROUND = 5    # Lowest priority

@dataclass
class TaskResult:
    task_id: str
    status: TaskStatus
    result: Optional[Any] = None
    error: Optional[str] = None
    execution_time_ms: float = 0.0
    completed_at: Optional[datetime] = None

    def to_dict(self):
        return {
            'task_id': self.task_id,
            'status': self.status.value,
            'result': self.result,
            'error': self.error,
            'execution_time_ms': self.execution_time_ms,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

@dataclass
class Task:
    id: str
    task_type: TaskType
    priority: TaskPriority
    payload: Dict[str, Any]
    created_at: datetime
    status: TaskStatus = TaskStatus.PENDING
    assigned_node: Optional[str] = None
    retries: int = 0
    max_retries: int = 3
    result: Optional[TaskResult] = None
    tags: List[str] = field(default_factory=list)
    depends_on: List[str] = field(default_factory=list)
    expires_at: Optional[datetime] = None

    def __lt__(self, other):
        """Compare tasks by priority and creation time"""
        if self.priority.value != other.priority.value:
            return self.priority.value < other.priority.value
        return self.created_at < other.created_at

    def to_dict(self):
        return {
            'id': self.id,
            'task_type': self.task_type.value,
            'priority': self.priority.value,
            'payload': self.payload,
            'created_at': self.created_at.isoformat(),
            'status': self.status.value,
            'assigned_node': self.assigned_node,
            'retries': self.retries,
            'result': self.result.to_dict() if self.result else None,
            'tags': self.tags,
            'depends_on': self.depends_on,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> 'Task':
        task = Task(
            id=data['id'],
            task_type=TaskType(data['task_type']),
            priority=TaskPriority(data['priority']),
            payload=data['payload'],
            created_at=datetime.fromisoformat(data['created_at']),
            status=TaskStatus(data['status']),
            assigned_node=data.get('assigned_node'),
            retries=data.get('retries', 0),
            tags=data.get('tags', []),
            depends_on=data.get('depends_on', [])
        )
        return task

class TaskQueue:
    """Async task queue with priority support and mesh integration"""

    def __init__(self, max_workers: int = 4):
        self.tasks: Dict[str, Task] = {}
        self.priority_queue: List[Task] = []
        self.completed_tasks: List[TaskResult] = []
        self.failed_tasks: List[TaskResult] = []
        self.workers = []
        self.max_workers = max_workers
        self.running = False
        self.task_handlers: Dict[TaskType, Callable] = {}
        self.completion_callbacks: Dict[str, List[Callable]] = {}
        self.error_callbacks: Dict[str, List[Callable]] = {}
        self.mesh_interface = None  # Will be set by mesh network

    def register_handler(self, task_type: TaskType, handler: Callable[..., Coroutine]):
        """Register a handler for a task type"""
        self.task_handlers[task_type] = handler

    def register_completion_callback(self, task_id: str, callback: Callable):
        """Register callback when task completes"""
        if task_id not in self.completion_callbacks:
            self.completion_callbacks[task_id] = []
        self.completion_callbacks[task_id].append(callback)

    def register_error_callback(self, task_id: str, callback: Callable):
        """Register callback when task fails"""
        if task_id not in self.error_callbacks:
            self.error_callbacks[task_id] = []
        self.error_callbacks[task_id].append(callback)

    def submit_task(self, task_type: TaskType, payload: Dict[str, Any],
                   priority: TaskPriority = TaskPriority.NORMAL,
                   depends_on: List[str] = None,
                   tags: List[str] = None) -> str:
        """Submit a new task to the queue"""
        task_id = str(uuid.uuid4())
        task = Task(
            id=task_id,
            task_type=task_type,
            priority=priority,
            payload=payload,
            created_at=datetime.now(),
            tags=tags or [],
            depends_on=depends_on or []
        )

        self.tasks[task_id] = task
        heapq.heappush(self.priority_queue, task)

        return task_id

    async def process_queue(self):
        """Main queue processing loop"""
        self.running = True

        # Start worker tasks
        self.workers = [
            asyncio.create_task(self._worker(i))
            for i in range(self.max_workers)
        ]

        # Wait for all workers to compete or ctrl-c
        try:
            await asyncio.gather(*self.workers)
        except asyncio.CancelledError:
            self.running = False

    async def _worker(self, worker_id: int):
        """Process tasks from the queue"""
        while self.running:
            try:
                # Get next task by priority
                if self.priority_queue:
                    task = heapq.heappop(self.priority_queue)

                    # Check if dependencies are met
                    if task.depends_on:
                        unmet = [dep for dep in task.depends_on if self.tasks[dep].status != TaskStatus.COMPLETED]
                        if unmet:
                            # Requeue task, dependencies not met
                            heapq.heappush(self.priority_queue, task)
                            await asyncio.sleep(0.1)
                            continue

                    # Check expiration
                    if task.expires_at and datetime.now() > task.expires_at:
                        result = TaskResult(
                            task_id=task.id,
                            status=TaskStatus.CANCELLED,
                            error="Task expired"
                        )
                        await self._complete_task(task, result)
                        continue

                    # Execute task
                    await self._execute_task(task)
                else:
                    await asyncio.sleep(0.1)
            except Exception as e:
                print(f"[ERROR] Worker {worker_id}: {str(e)}")
                await asyncio.sleep(1)

    async def _execute_task(self, task: Task):
        """Execute a single task"""
        start_time = datetime.now()
        task.status = TaskStatus.RUNNING

        try:
            # Get handler for task type
            handler = self.task_handlers.get(task.task_type)

            if not handler:
                raise ValueError(f"No handler registered for {task.task_type.value}")

            # Execute handler
            task_result = await handler(task.payload)

            # Create result
            execution_time = (datetime.now() - start_time).total_seconds() * 1000
            result = TaskResult(
                task_id=task.id,
                status=TaskStatus.COMPLETED,
                result=task_result,
                execution_time_ms=execution_time,
                completed_at=datetime.now()
            )

            await self._complete_task(task, result)

        except Exception as e:
            # Handle failure
            if task.retries < task.max_retries:
                task.retries += 1
                task.status = TaskStatus.RETRYING
                heapq.heappush(self.priority_queue, task)
                print(f"[RETRY] Task {task.id} - attempt {task.retries}/{task.max_retries}")
            else:
                execution_time = (datetime.now() - start_time).total_seconds() * 1000
                result = TaskResult(
                    task_id=task.id,
                    status=TaskStatus.FAILED,
                    error=str(e),
                    execution_time_ms=execution_time,
                    completed_at=datetime.now()
                )
                await self._complete_task(task, result)
                self.failed_tasks.append(result)

    async def _complete_task(self, task: Task, result: TaskResult):
        """Mark task as complete and trigger callbacks"""
        task.status = result.status
        task.result = result
        self.completed_tasks.append(result)

        # Trigger callbacks
        if result.status == TaskStatus.COMPLETED:
            callbacks = self.completion_callbacks.get(task.id, [])
            for callback in callbacks:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(result)
                    else:
                        callback(result)
                except Exception as e:
                    print(f"[ERROR] Callback error for task {task.id}: {str(e)}")

        elif result.status == TaskStatus.FAILED:
            callbacks = self.error_callbacks.get(task.id, [])
            for callback in callbacks:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(result)
                    else:
                        callback(result)
                except Exception as e:
                    print(f"[ERROR] Error callback error for task {task.id}: {str(e)}")

    def get_task_status(self, task_id: str) -> Optional[Task]:
        """Get status of a task"""
        return self.tasks.get(task_id)

    def get_pending_count(self) -> int:
        """Get count of pending tasks"""
        return len(self.priority_queue)

    def get_completed_count(self) -> int:
        """Get count of completed tasks"""
        return len(self.completed_tasks)

    def get_stats(self) -> Dict[str, Any]:
        """Get task queue statistics"""
        return {
            'total_tasks': len(self.tasks),
            'pending': self.get_pending_count(),
            'running': sum(1 for t in self.tasks.values() if t.status == TaskStatus.RUNNING),
            'completed': self.get_completed_count(),
            'failed': len(self.failed_tasks),
            'workers': self.max_workers,
            'avg_execution_time_ms': self._calculate_avg_exec_time()
        }

    def _calculate_avg_exec_time(self) -> float:
        """Calculate average execution time"""
        if not self.completed_tasks:
            return 0.0
        total = sum(t.execution_time_ms for t in self.completed_tasks)
        return total / len(self.completed_tasks)

    def export_state(self) -> Dict[str, Any]:
        """Export task queue state to JSON"""
        return {
            'tasks': {tid: t.to_dict() for tid, t in self.tasks.items()},
            'completed': [t.to_dict() for t in self.completed_tasks[-100:]],  # Last 100
            'failed': [t.to_dict() for t in self.failed_tasks],
            'stats': self.get_stats()
        }

    def import_state(self, state: Dict[str, Any]):
        """Import task queue state from JSON"""
        for task_id, task_data in state.get('tasks', {}).items():
            task = Task.from_dict(task_data)
            self.tasks[task_id] = task
            if task.status == TaskStatus.PENDING:
                heapq.heappush(self.priority_queue, task)

print("[OK] Task Queue module loaded")
