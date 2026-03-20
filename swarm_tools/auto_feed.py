import os
import json
import time
from pathlib import Path
from typing import Optional

import requests


def feed_directory(
    dirpath: Path,
    endpoint: str,
    pause: float = 0.01,
    verbose: bool = True,
    retries: int = 3,
    retry_delay: float = 1.0,
) -> None:
    """Walk through all .jsonl files under `dirpath` and POST each line to `endpoint`.

    Parameters
    ----------
    dirpath : Path
        Folder containing JSONL slices (e.g. produced by event_slicer).  Files are
        processed in alphabetical order.
    endpoint : str
        URL of the swarm queue API, e.g. http://localhost:7771/api/tasks
    pause : float
        Seconds to sleep between send operations (throttle rate).
    verbose : bool
        Print status messages.
    retries : int
        Number of times to retry a failed request.
    retry_delay : float
        Seconds to wait before retrying.
    """
    for fname in sorted(dirpath.iterdir()):
        if not fname.name.lower().endswith(".jsonl"):
            continue
        if verbose:
            print(f"feeding file {fname}")
        with fname.open("r", encoding="utf-8") as f:
            for lineno, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue
                try:
                    payload = json.loads(line)
                except json.JSONDecodeError:
                    if verbose:
                        print(f"skipping invalid json at {fname}:{lineno}")
                    continue
                for attempt in range(1, retries + 1):
                    try:
                        resp = requests.post(endpoint, json=payload, timeout=5)
                        resp.raise_for_status()
                        break
                    except Exception as exc:
                        if attempt == retries:
                            print(f"failed to send task after {retries} attempts: {exc}")
                        else:
                            time.sleep(retry_delay)
                time.sleep(pause)
    if verbose:
        print("feeding complete")


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("usage: python auto_feed.py <directory> <endpoint> [<pause>]")
        sys.exit(1)
    directory = Path(sys.argv[1])
    endpoint = sys.argv[2]
    pause = float(sys.argv[3]) if len(sys.argv) > 3 else 0.01
    feed_directory(directory, endpoint, pause)
