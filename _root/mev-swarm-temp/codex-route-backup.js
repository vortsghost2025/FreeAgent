import { execSync } from 'child_process';

// IMPORTANT: Replace this with your own private repository URL and branch.
const remoteName = 'origin';
const remoteUrl = process.env.CODEX_REMOTE_URL || 'https://github.com/vortsghost2025/mev-swarm-temp.git';
const branch = process.env.CODEX_BACKUP_BRANCH || 'main';

try {
  console.log('🔐 Codex route backup: configuring git remote');
  execSync(`git remote get-url ${remoteName}`, { stdio: 'ignore' });
  console.log(`🟢 Remote '${remoteName}' already configured`);
} catch {
  console.log(`🔧 Adding remote ${remoteName} -> ${remoteUrl}`);
  execSync(`git remote add ${remoteName} ${remoteUrl}`);
}

try {
  console.log('🌱 Creating snapshot commit');
  const ts = new Date().toISOString().slice(0, 16).replace(':', '-');
  execSync('git add -A');
  execSync(`git commit -m "snapshot-${ts}" --no-verify`, { stdio: 'inherit' });
} catch (err) {
  console.warn('⚠️ No changes to commit or commit skipped:', err.message);
}

console.log(`� pushing to ${remoteName}/${branch}`);
try {
  execSync(`git push -u ${remoteName} ${branch}`, { stdio: 'inherit' });
  console.log('✅ Backup push successful');
} catch (err) {
  console.error('❌ Backup push failed:', err.message);
  process.exit(1);
}
