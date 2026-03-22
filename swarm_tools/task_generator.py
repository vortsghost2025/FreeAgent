import time
import uuid


def generate_tasks(count: int):
    """Simulate adding `count` test tasks to the swarm.

    In a real deployment this function would call the swarm's REST
    API or push events onto the mesh. Here we simply print sample task
    JSON so you can redirect it into the cockpit console or your own
    feeder.
    """
    for i in range(count):
        task = {
            "id": f"task-{int(time.time()*1000)}-{i}",
            "type": "test",
            "payload": {
                "message": "this is a generated test task",
                "sequence": i,
            },
            "priority": 1,
            "timestamp": time.time(),
        }
        print(json.dumps(task))
        time.sleep(0.01)
