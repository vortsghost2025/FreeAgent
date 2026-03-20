import os
from pathlib import Path
import json


def slice_by_days(input_path: Path, output_dir: Path) -> None:
    """Read a JSONL file where each line is a dict with a timestamp field,
    and write one file per day containing that day's events.

    The timestamp is expected to be ISO8601 like "2026-02-22T19:35:33.568Z".
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    def get_day(ts: str) -> str:
        return ts.split("T")[0]

    handles = {}
    try:
        with input_path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                ts = obj.get("timestamp") or obj.get("time")
                if not ts:
                    continue
                day = get_day(ts)
                if day not in handles:
                    handles[day] = open(output_dir / f"events_{day}.jsonl", "w", encoding="utf-8")
                handles[day].write(line + "\n")
    finally:
        for h in handles.values():
            h.close()


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("usage: python event_slicer.py <input.jsonl> <output-dir>")
        sys.exit(1)

    inp = Path(sys.argv[1])
    out = Path(sys.argv[2])
    slice_by_days(inp, out)
    print(f"slicing complete, output in {out}")
