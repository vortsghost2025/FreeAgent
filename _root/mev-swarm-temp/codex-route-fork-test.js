# REMOVED: sensitive data redacted by automated security cleanup
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runHardhatNode() {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['hardhat', 'node', '--port', '8545'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    let started = false;

    const timeout = setTimeout(() => {
      if (!started) {
        child.kill();
        reject(new Error('Hardhat node startup timed out'));    
      }
    }, 30000);

    child.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
      if (!started && text.includes('Started HTTP and WebSocket JSON-RPC server')) {
        started = true;
        clearTimeout(timeout);
        resolve(child);
      }
    });

    child.stderr.on('data', (data) => process.stderr.write(data.toString()));

    child.on('exit', (code) => {
      if (!started) reject(new Error(`Hardhat node exited prematurely: ${code}`));
    });

    child.on('error', (err) => reject(err));
  });
}

(async () => {
  console.log('⏳ Starting hardhat node for fork test');
  let nodeProcess;

  try {
    nodeProcess = await runHardhatNode();

    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const blockNumber = await provider.getBlockNumber();
    console.log('✅ Hardhat fork test RPC reachable, block number:', blockNumber);

    const balance = await provider.getBalance('REDACTED_ADDRESS');
    console.log('✅ Sample balance at zero address (read-only):', balance.toString());

    console.log('✅ Fork test passed.');

    nodeProcess.kill();
    process.exit(0);
  } catch (err) {
    console.error('❌ Fork test failed:', err.message);
    if (nodeProcess && !nodeProcess.killed) {
      nodeProcess.kill();
    }
    process.exit(1);
  }
})();