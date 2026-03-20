import asyncio
import random
from typing import Any


class DummyAgent:
    def __init__(self, name: str, queue: asyncio.Queue):
        self.name = name
        self.queue = queue
        self.processed = 0

    async def run(self) -> None:
        """Continuously pull tasks from the queue and process them."""
        while True:
            task = await self.queue.get()
            if task is None:
                # sentinel to shut down
                self.queue.task_done()
                break
            # simulate work
            print(f"{self.name} picked up {task}")
            await asyncio.sleep(random.uniform(0.1, 0.5))
            print(f"{self.name} finished {task}")
            self.processed += 1
            self.queue.task_done()


def create_agents(count: int, queue: asyncio.Queue) -> list[DummyAgent]:
    return [DummyAgent(f"agent-{i+1}", queue) for i in range(count)]


async def run_swarm(agent_count: int, task_count: int) -> None:
    """Launch several dummy agents and feed them tasks in parallel."""
    queue: asyncio.Queue[Any] = asyncio.Queue()
    agents = create_agents(agent_count, queue)

    # start agent coroutines
    tasks = [asyncio.create_task(agent.run()) for agent in agents]

    # enqueue tasks
    for i in range(task_count):
        await queue.put(f"task-{i+1}")
    # add shutdown sentinel for each agent
    for _ in agents:
        await queue.put(None)

    # wait for all tasks to be processed
    await queue.join()
    # wait for agents to exit
    await asyncio.gather(*tasks)

    print("Swarm complete")


if __name__ == "__main__":
    import sys

    agent_count = int(sys.argv[1]) if len(sys.argv) > 1 else 4
    task_count = int(sys.argv[2]) if len(sys.argv) > 2 else 20

    asyncio.run(run_swarm(agent_count, task_count))
