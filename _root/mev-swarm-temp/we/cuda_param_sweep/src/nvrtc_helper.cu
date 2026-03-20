#include <nvrtc.h>
#include <cuda.h>
#include <iostream>
#include <vector>
#include <string>

#define NVRTC_CHECK(x)                                                   \
    do {                                                                 \
        nvrtcResult result = (x);                                        \
        if (result != NVRTC_SUCCESS) {                                   \
            std::cerr << "NVRTC error: " << nvrtcGetErrorString(result)  \
                      << " at " << __FILE__ << ":" << __LINE__ << "\n";  \
            std::exit(1);                                               \
        }                                                                \
    } while (0)

#define CUDA_CHECK(x)                                                     \
    do {                                                                 \
        CUresult result = (x);                                           \
        if (result != CUDA_SUCCESS) {                                    \
            const char *msg;                                             \
            cuGetErrorName(result, &msg);                                \
            std::cerr << "CUDA error: " << msg << " at " << __FILE__      \
                      << ":" << __LINE__ << "\n";                       \
            std::exit(1);                                               \
        }                                                                \
    } while (0)

// Compile a kernel string with NVRTC and return a loaded CUmodule
CUmodule compile_and_load(const std::string &src, const std::string &kernel_name) {
    nvrtcProgram prog;
    NVRTC_CHECK(nvrtcCreateProgram(&prog, src.c_str(), nullptr, 0, nullptr, nullptr));

    // Use the native GPU architecture
    const char *arch = "--gpu-architecture=native";
    nvrtcResult compileResult = nvrtcCompileProgram(prog, 1, &arch);

    // If compilation failed, print the log
    size_t logSize;
    NVRTC_CHECK(nvrtcGetProgramLogSize(prog, &logSize));
    if (logSize > 1) {
        std::vector<char> log(logSize);
        NVRTC_CHECK(nvrtcGetProgramLog(prog, log.data()));
        std::cerr << "NVRTC compile log:\n" << log.data() << "\n";
    }
    NVRTC_CHECK(compileResult);

    // Get PTX
    size_t ptxSize;
    NVRTC_CHECK(nvrtcGetPTXSize(prog, &ptxSize));
    std::vector<char> ptx(ptxSize);
    NVRTC_CHECK(nvrtcGetPTX(prog, ptx.data()));
    NVRTC_CHECK(nvrtcDestroyProgram(&prog));

    // Load PTX into a module
    CUmodule module;
    CUDA_CHECK(cuModuleLoadData(&module, ptx.data()));
    return module;
}

// Example usage (you can call this from your main program)
void launch_dynamic_kernel() {
    const std::string src = R"(
    extern "C" __global__
    void dyn_kernel(float *out, int N) {
        int idx = blockIdx.x * blockDim.x + threadIdx.x;
        if (idx < N) out[idx] = idx * 2.0f;
    })";

    CUmodule mod = compile_and_load(src, "dyn_kernel");
    CUfunction func;
    CUDA_CHECK(cuModuleGetFunction(&func, mod, "dyn_kernel"));

    const int N = 1024;
    float *d_out;
    CUDA_CHECK(cuMemAlloc(reinterpret_cast<CUdeviceptr *>(&d_out), N * sizeof(float)));

    void *args[] = { &d_out, &N };
    CUDA_CHECK(cuLaunchKernel(func,
                              (N + 255) / 256, 1, 1,   // grid
                              256, 1, 1,               // block
                              0, 0, args, nullptr));

    CUDA_CHECK(cuCtxSynchronize());
    CUDA_CHECK(cuMemFree(reinterpret_cast<CUdeviceptr>(d_out)));
    CUDA_CHECK(cuModuleUnload(mod));
}
