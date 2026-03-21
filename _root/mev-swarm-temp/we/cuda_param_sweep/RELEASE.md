# Release v1.0.0 – CUDA Kernel Parameter Launch Strategy Benchmark

**Date:** 2026‑03‑20  
**Authors:** Your Name <you@example.com>  

## Highlights
- Portable pre‑flight validation (`validate_environment.sh`).
- Systematic sweep of payload sizes from 64 ints (256 B) to 8192 ints (32 KB).
- Two launch strategies compared:
  1. **Default** – 4 KB launch‑parameter limit + `__constant__` tail.
  2. **Large‑parameter** – 32 KB launch‑argument feature (CUDA 12.1+).
- Publication‑ready plot (`sweep_results.png`) showing the crossover region.
- Regression test (`test_sweep.sh`) guarantees the kernels are not optimized away.

## How to reproduce
```bash
git clone https://github.com/<USERNAME>/<REPO>
cd cuda_param_sweep
chmod +x *.sh
./run_all.sh
```

## Citation
```bibtex
@software{cuda_param_sweep_2025,
  author = {Your Name},
  title  = {{CUDA Kernel Parameter Launch Strategy Benchmark}},
  year   = {2025},
  url    = {https://github.com/<USERNAME>/<REPO>},
  note   = {Research‑grade benchmark comparing 4KB vs 32KB kernel launch limits}
}
```

## Zenodo DOI
When you enable GitHub–Zenodo for this repository and push the `v1.0.0` tag, Zenodo will mint a DOI. Update the badge/DOI below after archiving:

```markdown
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.XXXXXXX.svg)](https://doi.org/10.5281/zenodo.XXXXXXX)
```

---

*Notes:* replace `<USERNAME>` and `<REPO>` with your GitHub handle and repository name before publishing.
