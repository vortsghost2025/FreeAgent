cmake_minimum_required(VERSION 3.18)
project(dynamic_strategy_compiler LANGUAGES CXX CUDA)

# This CMake is a helper to build the compile_runner that links against the
# nvrtc_helper.cu implementation located in we/cuda_param_sweep/src.

find_package(CUDA REQUIRED)
enable_language(CUDA)

add_executable(compile_runner compile_runner.cpp)

# Point this to the nvrtc_helper.cu from the cuda_param_sweep folder
target_sources(compile_runner PRIVATE "${CMAKE_SOURCE_DIR}/../we/cuda_param_sweep/src/nvrtc_helper.cu")

target_include_directories(compile_runner PRIVATE ${CUDA_INCLUDE_DIRS})
target_link_libraries(compile_runner PRIVATE ${CUDA_LIBRARIES})

message(STATUS "To build: mkdir build && cd build && cmake .. && cmake --build .")
