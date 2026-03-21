#!/usr/bin/env node
// Node CommonJS wrapper that exposes a deployAIGeneratedStrategy function.
// It writes the provided CUDA source to a temporary file and invokes the
// `compile_runner` binary (build instructions in gpu/README.md). This is a
// scaffold: it will explain missing steps if the runner is not present.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const deadman = require('../safety/deadman.cjs');

function deployAIGeneratedStrategy(cudaSource, kernelName = 'strategy_kernel', opts = {}) {
  return new Promise((resolve, reject) => {
    if (!deadman.isArmed()) {
      return reject(new Error('Dead-man switch is not armed. Set DEADMAN_ARMED=true or create DEADMAN_ARMED file at repo root to proceed.'));
    }

    const workspaceRoot = path.resolve(__dirname, '..');
    const runnerPathEnv = process.env.NVRTC_RUNNER_PATH;
    const defaultRunner = path.join(workspaceRoot, 'gpu', 'compile_runner');
    const runner = runnerPathEnv || defaultRunner;

    if (!fs.existsSync(runner)) {
      return reject(new Error(`Compile runner not found at ${runner}. Build it by following gpu/README.md (CMake build). Or set NVRTC_RUNNER_PATH to your runner binary.`));
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dyn-strat-'));
    const srcPath = path.join(tmpDir, 'strategy.cu');
    fs.writeFileSync(srcPath, cudaSource, 'utf8');

    const args = [srcPath, kernelName];
    const child = spawn(runner, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });

    child.on('close', code => {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
      if (code === 0) return resolve({ success: true, out: stdout });
      return reject(new Error(`Runner exited ${code}: ${stderr || stdout}`));
    });
    child.on('error', err => {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
      return reject(err);
    });
  });
}

// If invoked directly, expose a tiny CLI for manual testing
if (require.main === module) {
  (async () => {
    const inFile = process.argv[2];
    const kernel = process.argv[3] || 'strategy_kernel';
    if (!inFile) {
      console.error('Usage: node dynamicStrategyCompiler.cjs <kernel_source.cu> [kernel_name]');
      process.exit(2);
    }
    try {
      const src = fs.readFileSync(inFile, 'utf8');
      const res = await deployAIGeneratedStrategy(src, kernel);
      console.log('SUCCESS:', res.out || 'compiled');
    } catch (e) {
      console.error('ERROR:', e.message || e);
      process.exit(1);
    }
  })();
}

module.exports = { deployAIGeneratedStrategy };
