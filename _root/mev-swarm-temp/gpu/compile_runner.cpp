// compile_runner.cpp
// Simple CLI that reads a CUDA source file and attempts to compile/load it
// via the nvrtc_helper provided in the CUDA sweep codebase. This is a scaffold
// that must be built and linked against the CUDA/NVRTC libs and the
// nvrtc_helper.cu implementation.

#include <iostream>
#include <fstream>
#include <sstream>
#include <string>

// Forward declare the helper from nvrtc_helper.cu
// We'll perform a direct NVRTC compile in this runner for a standalone smoke test.
#include <nvrtc.h>
#include <vector>

static void check_nvrtc(nvrtcResult r) {
    if (r != NVRTC_SUCCESS) {
        std::cerr << "NVRTC error: " << nvrtcGetErrorString(r) << "\n";
        std::exit(1);
    }
}

bool compile_to_ptx(const std::string &src, std::string &out_ptx) {
    nvrtcProgram prog;
    check_nvrtc(nvrtcCreateProgram(&prog, src.c_str(), nullptr, 0, nullptr, nullptr));
    // Do not pass a hardcoded architecture here; let NVRTC pick defaults.
    nvrtcResult cret = nvrtcCompileProgram(prog, 0, nullptr);
    size_t logSize;
    check_nvrtc(nvrtcGetProgramLogSize(prog, &logSize));
    if (logSize > 1) {
        std::vector<char> log(logSize);
        check_nvrtc(nvrtcGetProgramLog(prog, log.data()));
        std::cerr << "NVRTC compile log:\n" << log.data() << "\n";
    }
    if (cret != NVRTC_SUCCESS) {
        nvrtcDestroyProgram(&prog);
        return false;
    }
    size_t ptxSize;
    check_nvrtc(nvrtcGetPTXSize(prog, &ptxSize));
    out_ptx.resize(ptxSize);
    check_nvrtc(nvrtcGetPTX(prog, &out_ptx[0]));
    nvrtcDestroyProgram(&prog);
    return true;
}

int main(int argc, char** argv) {
    if (argc < 2) {
        std::cerr << "Usage: compile_runner <kernel_source.cu> [kernel_name]\n";
        return 2;
    }
    std::string path = argv[1];
    std::string kernel = (argc >= 3) ? argv[2] : "strategy_kernel";

    std::ifstream f(path);
    if (!f) {
        std::cerr << "Failed to open kernel file: " << path << "\n";
        return 3;
    }
    std::stringstream buf;
    buf << f.rdbuf();
    std::string src = buf.str();

    try {
        std::string ptx;
        bool ok = compile_to_ptx(src, ptx);
        if (!ok) {
            std::cerr << "NVRTC compilation failed (see log above)\n";
            return 4;
        }
        std::cout << "Compiled to PTX (size=" << ptx.size() << ") for kernel: " << kernel << "\n";
        return 0;
    } catch (const std::exception &e) {
        std::cerr << "Exception during compilation: " << e.what() << "\n";
        return 5;
    } catch (...) {
        std::cerr << "Unknown error during compilation\n";
        return 6;
    }
}
