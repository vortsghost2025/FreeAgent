import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoDir = __dirname;

function runGitDiff(files) {
  return new Promise((resolve, reject) => {
    const git = spawn('git', ['diff', '--', ...files], {
      cwd: repoDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    let error = '';
    git.stdout.on('data', (data) => (output += data.toString()));
    git.stderr.on('data', (data) => (error += data.toString()));

    git.on('close', (code) => {
      if (code !== 0) return reject(new Error(`git diff failed: ${error}`));
      resolve(output);
    });
  });
}

(async () => {
  const files = [
    'historical-baseline-launcher.js',
    'working-launcher.js',
    'direct-wallet-executor.js',
  ];

  const diffFile = path.join(__dirname, 'codex-route-diff.patch');

  if (!fs.existsSync(path.join(repoDir, '.git'))) {
    console.error('❌ No git repository found here; cannot produce diff with git diff.');
    process.exit(1);
  }

  try {
    const diff = await runGitDiff(files);
    if (!diff) {
      console.log('✅ No changes detected in target files relative to HEAD');
      process.exit(0);
    }
    fs.writeFileSync(diffFile, diff);
    console.log('✅ Generated diff file:', diffFile);
    console.log(diff);
  } catch (err) {
    console.error('❌ Error running diff:', err.message);
    process.exit(1);
  }
})();
