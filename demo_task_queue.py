# DEMO_TASK_QUEUE.PY - Task Queue with Mesh Federation Integration

import asyncio
import json
from task_queue import TaskQueue, TaskType, TaskPriority, TaskStatus
from datetime import datetime

async def fortress_build_handler(payload):
    """Handler for fortress building tasks"""
    await asyncio.sleep(0.5)  # Simulate work
    return {
        "module_built": payload.get("module_name"),
        "level": payload.get("level", 1),
        "completed_at": datetime.now().isoformat()
    }

async def fortress_repair_handler(payload):
    """Handler for fortress repair tasks"""
    await asyncio.sleep(0.3)
    return {
        "module_repaired": payload.get("module_id"),
        "health_restored": payload.get("health", 50),
        "completed_at": datetime.now().isoformat()
    }

async def federation_sync_handler(payload):
    """Handler for federation synchronization"""
    await asyncio.sleep(0.2)
    return {
        "federation_id": payload.get("federation_id"),
        "synced_nodes": payload.get("node_count", 1),
        "completed_at": datetime.now().isoformat()
    }

async def mesh_discovery_handler(payload):
    """Handler for mesh node discovery"""
    await asyncio.sleep(0.1)
    return {
        "discovered_nodes": payload.get("discovery_count", 3),
        "network_size": payload.get("network_size", 5),
        "completed_at": datetime.now().isoformat()
    }

async def conflict_resolve_handler(payload):
    """Handler for conflict resolution"""
    await asyncio.sleep(0.2)
    return {
        "conflict_id": payload.get("conflict_id"),
        "resolution": "last_write_wins",
        "completed_at": datetime.now().isoformat()
    }

async def run_task_queue_demo():
    """Run comprehensive task queue demonstration"""

    print("\n" + "=" * 70)
    print("TASK QUEUE DEMONSTRATION")
    print("=" * 70)

    # Create task queue
    task_queue = TaskQueue(max_workers=3)

    # Register handlers
    task_queue.register_handler(TaskType.FORTRESS_BUILD, fortress_build_handler)
    task_queue.register_handler(TaskType.FORTRESS_REPAIR, fortress_repair_handler)
    task_queue.register_handler(TaskType.FEDERATION_SYNC, federation_sync_handler)
    task_queue.register_handler(TaskType.MESH_DISCOVERY, mesh_discovery_handler)
    task_queue.register_handler(TaskType.CONFLICT_RESOLVE, conflict_resolve_handler)

    print("\n[OK] Task handlers registered")
    print("[OK] Starting task queue with 3 workers...")

    # Create task processing coroutine
    queue_task = asyncio.create_task(task_queue.process_queue())

    # Submit tasks in batches
    print("\n[BATCH 1] Submitting critical mesh discovery task...")
    discovery_task = task_queue.submit_task(
        TaskType.MESH_DISCOVERY,
        {"discovery_count": 5, "network_size": 6},
        priority=TaskPriority.CRITICAL,
        tags=["network", "discovery"]
    )

    await asyncio.sleep(0.1)

    print("[BATCH 2] Submitting high-priority fortress tasks...")
    build_tasks = []
    for i in range(3):
        task_id = task_queue.submit_task(
            TaskType.FORTRESS_BUILD,
            {"module_name": f"Module_{i}", "level": 1},
            priority=TaskPriority.HIGH,
            tags=["fortress", "construction"],
            depends_on=[discovery_task] if i == 0 else []
        )
        build_tasks.append(task_id)
        print(f"  - Submitted fortress build task: {task_id[:8]}...")

    await asyncio.sleep(0.1)

    print("[BATCH 3] Submitting normal priority tasks...")
    for i in range(2):
        task_queue.submit_task(
            TaskType.FORTRESS_REPAIR,
            {"module_id": f"core_{i}", "health": 50},
            priority=TaskPriority.NORMAL,
            tags=["fortress", "repair"],
            depends_on=[build_tasks[0]]
        )

    await asyncio.sleep(0.1)

    print("[BATCH 4] Submitting federation sync tasks...")
    for i in range(2):
        task_queue.submit_task(
            TaskType.FEDERATION_SYNC,
            {"federation_id": f"fed_{i}", "node_count": 4},
            priority=TaskPriority.LOW,
            tags=["federation", "sync"]
        )

    await asyncio.sleep(0.1)

    print("[BATCH 5] Submitting background conflict resolution...")
    task_queue.submit_task(
        TaskType.CONFLICT_RESOLVE,
        {"conflict_id": "conflict_2026", "type": "state_divergence"},
        priority=TaskPriority.BACKGROUND,
        tags=["conflict", "resolution"]
    )

    print(f"\n[OK] Submitted {len(task_queue.tasks)} total tasks")
    print(f"[OK] Pending tasks: {task_queue.get_pending_count()}")

    # Monitor progress
    print("\n[PROGRESS] Monitoring task execution...")
    for cycle in range(10):
        await asyncio.sleep(0.5)

        stats = task_queue.get_stats()
        print(f"\n[CYCLE {cycle + 1}]")
        print(f"  Pending: {stats['pending']:2d} | Running: {stats['running']:2d} | Completed: {stats['completed']:2d} | Failed: {stats['failed']:2d}")
        print(f"  Avg execution: {stats['avg_execution_time_ms']:.1f}ms")

        if stats['pending'] == 0 and stats['running'] == 0:
            print("\n[COMPLETE] All tasks processed!")
            break

    # Stop workers
    task_queue.running = False
    try:
        await asyncio.wait_for(queue_task, timeout=2.0)
    except asyncio.TimeoutError:
        queue_task.cancel()

    # Generate final report
    print("\n" + "=" * 70)
    print("FINAL REPORT")
    print("=" * 70)

    final_stats = task_queue.get_stats()
    print(f"\nTask Statistics:")
    print(f"  Total Tasks:        {final_stats['total_tasks']}")
    print(f"  Completed:          {final_stats['completed']}")
    print(f"  Failed:             {final_stats['failed']}")
    print(f"  Average Exec Time:  {final_stats['avg_execution_time_ms']:.2f}ms")

    print(f"\nTask Breakdown by Type:")
    type_counts = {}
    for task in task_queue.tasks.values():
        task_type = task.task_type.value
        type_counts[task_type] = type_counts.get(task_type, 0) + 1

    for task_type, count in sorted(type_counts.items()):
        print(f"  {task_type:20s}: {count:3d}")

    print(f"\nTask Breakdown by Status:")
    status_counts = {}
    for task in task_queue.tasks.values():
        status = task.status.value
        status_counts[status] = status_counts.get(status, 0) + 1

    for status, count in sorted(status_counts.items()):
        print(f"  {status:15s}: {count:3d}")

    # Export state
    state = task_queue.export_state()
    state_file = "c:/workspace/task_queue_state.json"
    with open(state_file, 'w') as f:
        json.dump(state, f, indent=2, default=str)

    print(f"\n[OK] Task queue state saved to: {state_file}")
    print(f"[OK] Completed tasks: {len(state['completed'])}")
    print(f"[OK] Failed tasks: {len(state['failed'])}")

if __name__ == "__main__":
    print("[OK] Task Queue Demo Starting...")
    asyncio.run(run_task_queue_demo())
    print("\n[OK] Task Queue Demo Complete!")
