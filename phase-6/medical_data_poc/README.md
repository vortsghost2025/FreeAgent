# Medical Data POC (Synthetic Only)

WARNING: This is a synthetic data proof of concept. Do not use for real medical analysis.

## Safe Usage

Step 1: Generate synthetic data

```bash
python safe_loader.py
```

Step 2: Run the symptom checker CLI

```bash
python symptom_checker.py
```

## Architecture (Safe Path)

- The legacy dataset.csv file is treated as a template reference only and is never used for analysis.
- The safe loader generates synthetic_*.csv files from allowlisted schemas.
- The CLI reads only synthetic_*.csv via safe_analysis.py and wraps output in a mandatory disclaimer.

If synthetic_*.csv files are missing, run safe_loader.py before running the CLI.
