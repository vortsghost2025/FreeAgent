# NVRTC Dynamic Strategy Compiler (scaffold)

This folder contains scaffolding for dynamically compiling AI-generated CUDA kernels at runtime using NVRTC.

Files:
- `dynamic-strategy-compiler.cu` — placeholder source for generated strategies.
- `compile_runner.cpp` — a small CLI scaffold that reads a `.cu` file and calls the `compile_and_load` helper from the sweep's `nvrtc_helper.cu`.
- `CMakeLists.txt` — helper CMake project to build `compile_runner`.
- `dynamicStrategyCompiler.cjs` — Node CommonJS wrapper that writes CUDA source to a temp file and invokes `compile_runner`.

Build instructions (example):

```bash
mkdir build && cd build
cmake ..
cmake --build .
# resulting binary: ./compile_runner
```

Notes:
- `we/cuda_param_sweep/src/nvrtc_helper.cu` already implements `compile_and_load` and runtime helpers. Link `compile_runner` with that implementation (CMake points to it).
- The Node wrapper expects the runner binary at `gpu/compile_runner` by default; set `NVRTC_RUNNER_PATH` to a different path if desired.
- For safety, `dynamicStrategyCompiler.cjs` requires the dead-man switch to be armed (`DEADMAN_ARMED=true` or a `DEADMAN_ARMED` file at repo root) before invoking compilation.

This is a scaffold — building/testing the runner requires a CUDA toolchain (NVRTC/CUDA toolkit) and a compatible GPU driver.
