#!/usr/bin/env python3
"""Prequeue 50 tasks by posting messages to the API's agent receive endpoint.

Usage: python tools/prequeue_tasks.py [--url http://127.0.0.1:8100] [--count 50]
"""
import argparse
import requests
import time
import json
from datetime import datetime
import random


def make_task(i):
    return {
        "message": f"Execute coding task #{i}: implement feature X (simulate)",
        "sender": "task_prequeuer",
        "receiver": "persistent_agent",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "metadata": {
            "task": {
                "id": f"prequeue-{int(time.time())}-{i}",
                "description": f"Auto-generated prequeued task #{i}",
                "priority": random.randint(1, 100),
                "estimated_seconds": random.randint(1,10)
            }
        }
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:8100", help="Base API URL")
    parser.add_argument("--count", type=int, default=50, help="Number of tasks to enqueue")
    parser.add_argument("--delay", type=float, default=0.05, help="Seconds between requests")
    args = parser.parse_args()

    endpoint = args.url.rstrip("/") + "/agents/persistent_agent/receive"
    print(f"Enqueuing {args.count} tasks to {endpoint}")

    successes = 0
    failures = 0
    for i in range(1, args.count + 1):
        payload = make_task(i)
        try:
            resp = requests.post(endpoint, json=payload, timeout=5)
            if resp.status_code == 200:
                successes += 1
                print(f"[{i}] enqueued -> {resp.json().get('message_id')}")
            else:
                failures += 1
                print(f"[{i}] FAILED status={resp.status_code} body={resp.text}")
        except Exception as e:
            failures += 1
            print(f"[{i}] ERROR {e}")

        time.sleep(args.delay)

    print("\nDone.")
    print(f"Successes: {successes}, Failures: {failures}")


if __name__ == '__main__':
    main()
