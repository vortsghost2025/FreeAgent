#!/usr/bin/env python3
"""
plot_times.py – generate a quick “build time vs. threads” chart
from the time_*.log files created by benchmark_run.sh.
"""
import pathlib, re
import matplotlib.pyplot as plt

log_files = sorted(pathlib.Path('.').glob('*_report_logs/time_t*.log'))
threads, times = [], []

for log in log_files:
    txt = log.read_text(errors='ignore')
    m = re.search(r'Elapsed\s*\(wall clock time\)\s*([0-9.]+)\s*seconds', txt)
    if not m:
        # fallback: try a looser match for 'Elapsed' lines
        m = re.search(r'Elapsed[^\d]*([0-9.]+)\s*seconds', txt)
    if m:
        t = float(m.group(1))
        n_match = re.search(r't(\d+)\.log', log.name)
        if n_match:
            n = int(n_match.group(1))
            threads.append(n)
            times.append(t)

if not threads:
    print('No time_t*.log files found or no elapsed times parsed.')
else:
    plt.figure(figsize=(6, 4))
    plt.scatter(threads, times, s=80, color='steelblue')
    for x, y in zip(threads, times):
        plt.text(x, y, f"{y:.2f}s", fontsize=9, ha='center', va='bottom')
    plt.xlabel('Threads (-t)')
    plt.ylabel('Wall‑clock seconds')
    plt.title('Build time vs. parallel threads')
    plt.grid(True, linestyle='--', alpha=0.5)
    plt.tight_layout()
    out = 'build_time_vs_threads.png'
    plt.savefig(out)
    print(f"✅ Plot saved as {out}")
