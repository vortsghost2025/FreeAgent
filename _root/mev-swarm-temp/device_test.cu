// device_test.cu -------------------------------------------------
// Minimal kernel for sanity-checking the benchmark pipeline
#include <cstdio>

extern "C" __global__ void hello()
{
    printf("Hello from GPU thread %d\n", threadIdx.x);
}

int main()
{
    // launch a tiny kernel to exercise compilation and linking
    hello<<<1, 4>>>();
    cudaDeviceSynchronize();
    return 0;
}
