PR Title: ci: Add Azure VM bootstrap and profiling runbook for GPU Nsight pipeline

PR Description:

Summary
- Adds an Azure VM bootstrap script and CI runbook to build and (optionally) run Nsight Compute on GPU VMs to produce profiling artifacts for our CUDA kernel experiments.

What this PR changes
- Adds `ci/azure_vm_setup.ps1`: VM bootstrap to install prerequisites (Visual C++ build tools, CUDA toolkit, Nsight Compute if available via winget), run the existing `scripts/build_with_vcvars.ps1`, and archive profiling artifacts.
- Adds `ci/README.md`: concise runbook describing local and cloud workflows, validation checklist, and artifact locations.

Why
- Reproducible GPU profiling requires a clean, repeatable VM image with Nsight tools available. This provides a documented bootstrap and a scriptable way to collect `ncu` exports and summary text for review.

How to validate
1. On a Windows Azure GPU VM (with network access), run `ci\azure_vm_setup.ps1` as Administrator from the repo root.
2. Confirm `scripts/build_with_vcvars.ps1` builds `build\cuda_sample_clpath.exe` with exit code 0.
3. If Nsight Compute installs successfully, confirm `build\profiling_results_<timestamp>` contains `ncu` exports and `summary_final.txt` with occupancy >85% for the kernel.

Notes & Caveats
- Nsight Compute is not present on the developer host used to create this PR; profiling must run on a VM with the profiler installed (script attempts `winget` where available).
- This PR intentionally does not alter persistent PATH or system-wide VC++ settings; `scripts/build_with_vcvars.ps1` loads vcvars temporarily.

Checklist
- [x] Script added to `ci/azure_vm_setup.ps1`
- [x] Runbook added to `ci/README.md`
- [x] Local build validated producing `build\cuda_sample_clpath.exe` (exit code 0)
- [ ] CI/VM run validated (Nsight Compute present on target VM)

Suggested merge actions
- Merge to `main` and run the script on an Azure GPU VM (or attach to CI pipeline) to produce final profiling artifacts and confirm occupancy metrics.
