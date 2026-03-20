# KiloCode GPU Profiling Pipeline

## Overview
Automated GPU hotspot identification using Nsight Systems/Compute on Windows + Azure GPU VMs. Validates CUDA kernel performance and occupancy without driver overhead noise.

## Prerequisites
- Visual Studio Build Tools (requires `cl.exe` in PATH)
- NVIDIA CUDA Toolkit (version >= 13.2)
- Nsight Systems / Nsight Compute installed on target machine
- Windows 11 or Server 2022

## Local Development Workflow
```powershell
# Run validated build with register limit cap
& ./scripts/build_with_vcvars.ps1 -Source CudaTest/test.cu -Out build/cuda_sample.exe -MaxRegCount 32 -Arch sm_86

# Verify run succeeds (kernel time ~900ms, no TDR crash)
.\build\cuda_sample.exe
```

## Cloud Deployment (Azure GPU VM)
1. Upload `ci/` folder and repo to Azure Storage.
2. Provision VM (Windows Server 2022, NVIDIA L4/A100 GPU).
3. Execute setup script: `./ci/azure_vm_setup.ps1`.
4. Results exported to `./output/report/`.

## Known Configuration & Limits
- **GPU:** GeForce RTX 5060 (Blackwell, compute capability 8.6) / Azure Equivalent
- **Safe Runtime:** < 2 seconds (Windows TDR watchdog limit)
- **Target Occupancy:** > 85%
- **Build Flags:** `-maxrregcount=32 -arch=sm_86`

## Validation Checklist
- [x] Build exits with code 0 (fixed via `build_with_vcvars.ps1`)
- [x] Kernel runs > 50ms (visible by Nsight)
- [x] No crashes or access violations
- [x] Occupancy > 85% confirmed in local reports (92.13%)
- [ ] Azure VM profile generated (next milestone)
