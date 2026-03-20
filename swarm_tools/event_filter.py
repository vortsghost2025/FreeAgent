import json
from pathlib import Path
from typing import List


def filter_events(input_path: Path, output_path: Path, keywords: List[str]) -> None:
    """Copy only lines containing any of the given keywords (case-insensitive)."""
    keywords_lower = [k.lower() for k in keywords]
    with input_path.open("r", encoding="utf-8") as inp, output_path.open("w", encoding="utf-8") as outp:
        for line in inp:
            text = line.lower()
            if any(k in text for k in keywords_lower):
                outp.write(line)


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 4:
        print("usage: python event_filter.py <input> <output> <keyword1> [keyword2 ...]")
        sys.exit(1)
    inp = Path(sys.argv[1])
    out = Path(sys.argv[2])
    keys = sys.argv[3:]
    filter_events(inp, out, keys)
    print(f"filtered events written to {out}")
