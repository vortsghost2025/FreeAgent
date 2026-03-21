extern "C" __global__
void test_kernel(float *out, int N) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < N) out[idx] = idx * 1.0f;
}
