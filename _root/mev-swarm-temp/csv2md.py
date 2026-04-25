#!/usr/bin/env python3
"""
csv2md.py – turn an nvcc -time CSV into a Markdown table.
Usage:
    python3 csv2md.py compile_times_t8.csv >> benchmark_report.md
"""

import csv, sys, pathlib

def csv_to_md(csv_path: pathlib.Path, header: str = "Phase / Duration (ms)") -> str:
    rows = []
    with csv_path.open(newline='') as f:
        reader = csv.reader(f)
        for row in reader:
            rows.append("| " + " | ".join(row) + " |")
    md = f"| {header} |\n|---|\n"
    md += "\n".join(rows)
    return md

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: csv2md.py <compile_times.csv>")
        sys.exit(1)
    csv_file = pathlib.Path(sys.argv[1])
    print(csv_to_md(csv_file))
