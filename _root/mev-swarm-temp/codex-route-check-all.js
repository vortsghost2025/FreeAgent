import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const baseDir = path.resolve('.');
const logFile = path.join(baseDir, 'codex-route-check-all.log');
const summaryFile = path.join(baseDir, 'PRODUCTION_SUMMARY.md');

function appendLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(logFile, line);
  console.log(message);
}

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    appendLog(`RUNNING: ${command} ${args.join(' ')}`);
    const child = spawn(command, args, { cwd: baseDir, shell: true });

    child.stdout.on('data', (data) => {
      const text = data.toString();
      appendLog(text.trim());
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      appendLog(`ERROR: ${text.trim()}`);
    });

    child.on('close', (code) => {
      if (code === 0) return resolve(code);
      const error = new Error(`${command} exited ${code}`);
      error.code = code;
      reject(error);
    });

    child.on('error', (err) => reject(err));
  });
}

async function main() {
  const results = [];

  for (const step of [
    { name: 'codex-recovery', cmd: 'npm', args: ['run', 'codex-recovery'] },
    { name: 'codex-diff', cmd: 'npm', args: ['run', 'codex-diff'] },
    { name: 'codex-fork-test', cmd: 'npm', args: ['run', 'codex-fork-test'] },
  ]) {
    try {
      await runCommand(step.cmd, step.args);
      results.push({ step: step.name, status: 'PASS' });
    } catch (err) {
      results.push({ step: step.name, status: 'FAIL', message: err.message });
      break;
    }
  }

  appendLog('SUMMARY:');
  for (const result of results) {
    appendLog(`  - ${result.step}: ${result.status}${result.message ? ' (' + result.message + ')' : ''}`);
  }

  const summaryLines = ['\n## Codex Route Check-all Results (automated)', `- Date: ${new Date().toISOString()}`];
  results.forEach((result) => {
    summaryLines.push(`- ${result.step}: ${result.status}${result.message ? ' - ' + result.message : ''}`);
  });
  summaryLines.push('');

  fs.appendFileSync(summaryFile, summaryLines.join('\n'));

  const failed = results.some((r) => r.status === 'FAIL');
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  appendLog(`FATAL: ${err.message}`);
  process.exit(1);
});