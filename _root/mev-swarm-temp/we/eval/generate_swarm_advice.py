#!/usr/bin/env python3
"""Generate a small JSON advice report for the SNAC orchestrator
based on the CUDA sweep results.
"""
import os
import json
import pandas as pd


def find_csv():
    # common locations
    candidates = [
        os.path.join('we', 'cuda_param_sweep', 'sweep_results.csv'),
        os.path.join('we', 'cuda_param_sweep', 'sweep_results.csv'),
        'sweep_results.csv'
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c
    raise FileNotFoundError('sweep_results.csv not found in expected locations')


def generate():
    csv = find_csv()
    df = pd.read_csv(csv)

    if df.empty:
        raise SystemExit('empty sweep results')

    if 'throughput' in df.columns:
        best = df.loc[df['throughput'].idxmax()]
    else:
        # fallback to smallest default_us latency
        best = df.loc[df['default_us'].idxmin()]

    best_total = int(best.get('total_params', best.get('TOTAL_PARAMS', 0)))
    peak = float(best.get('throughput', best.get('default_us', 0)))

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
