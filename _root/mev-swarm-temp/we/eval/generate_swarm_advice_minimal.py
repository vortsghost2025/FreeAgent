#!/usr/bin/env python3
"""Lightweight advice generator without external dependencies (no pandas).
This is for quick local testing only and does the same output as generate_swarm_advice.py.
"""
import csv
import json
import os

def find_csv():
    candidates = [
        os.path.join('we', 'cuda_param_sweep', 'sweep_results.csv'),
        'sweep_results.csv'
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c
    raise FileNotFoundError('sweep_results.csv not found')

def generate():
    csvp = find_csv()
    with open(csvp, newline='') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    if not rows:
        raise SystemExit('empty sweep results')

    # Pick best by throughput if present
    if 'throughput' in rows[0]:
        best = max(rows, key=lambda r: float(r.get('throughput') or 0))
    else:
        best = min(rows, key=lambda r: float(r.get('default_us') or 0))

    best_total = int(float(best.get('total_params') or best.get('TOTAL_PARAMS') or 0))
    peak = float(best.get('throughput') or best.get('default_us') or 0)

    report = {
        'best_total_params': best_total,
        'peak_throughput': peak,
        'advice': f'Set TOTAL_PARAMS to {best_total} for best observed throughput',
    }

    out_dir = os.path.join('we', 'eval')
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, 'swarm_cuda_advice.json')
    with open(out_path, 'w') as f:
        json.dump(report, f, indent=2)

    print('WROTE', out_path)

if __name__ == '__main__':
    generate()
