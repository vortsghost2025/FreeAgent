import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PORT = process.env.PORT || 3000;
const URL = `ws://localhost:${PORT}`;

const ARGV = process.argv.slice(2);
const UPDATE_MODE = ARGV.includes('--update');
const RECORD_MODE = ARGV.includes('--record') || UPDATE_MODE;
const REPLAY_MODE = ARGV.includes('--replay');
const REGRESS_MODE = ARGV.includes('--regress');
const RECORDINGS_DIR = path.resolve('./we/eval/recordings');

// optional output file
let OUT_PATH = path.resolve('./we/eval/results.json');
const outIndex = ARGV.indexOf('--out');
if (outIndex >= 0 && ARGV[outIndex + 1]) {
  OUT_PATH = path.resolve(ARGV[outIndex + 1]);
}

if (!fs.existsSync(path.resolve('./we/eval'))) fs.mkdirSync(path.resolve('./we/eval'), { recursive: true });
if (!fs.existsSync(RECORDINGS_DIR)) fs.mkdirSync(RECORDINGS_DIR, { recursive: true });

const rawCases = fs.readFileSync(path.resolve('./we/eval/cases.json'), 'utf8');
const cases = JSON.parse(rawCases);

const REFUSAL_PATTERNS = ["I'm sorry", 'As an AI', 'Note that'];

function runCase(caseObj) {
  return new Promise((resolve) => {
    const result = { id: caseObj.id, prompt: caseObj.prompt, agents: [], error: null, passed: null, failReasons: [] };
    const agentResponses = {};

    const evaluateAssertions = (finalText) => {
      const reasons = [];
      for (const p of REFUSAL_PATTERNS) if (finalText.includes(p)) reasons.push(`Refusal detected: ${p}`);
      // code fence check
      if (caseObj.expected_fence) {
        if (!finalText.includes(caseObj.expected_fence)) reasons.push(`Missing fence: ${caseObj.expected_fence}`);
      }
      if (Array.isArray(caseObj.required)) {
        for (const sub of caseObj.required) {
          if (!finalText.includes(sub)) reasons.push(`Missing required substring: ${sub}`);
        }
      }
      return reasons;
    };

    const finish = () => {
      // assemble final text across all agents
      const finalCombined = Object.values(agentResponses).join('\n\n');
      result.agents = Object.keys(agentResponses).map(a => ({ agent: a, response: agentResponses[a], length: agentResponses[a]?.length || 0 }));
      const reasons = evaluateAssertions(finalCombined);
      result.failReasons = reasons;
      result.passed = reasons.length === 0 && !result.error;

      // record if requested
      if (RECORD_MODE) {
        try {
          const rec = { case: caseObj, responses: agentResponses, recorded_at: new Date().toISOString() };
          fs.writeFileSync(path.join(RECORDINGS_DIR, `${caseObj.id}.json`), JSON.stringify(rec, null, 2));
        } catch (e) { /* ignore */ }
      }

      resolve(result);
    };

    // If replay mode, load recorded responses and skip live server
    if (REPLAY_MODE) {
      try {
        const recFile = path.join(RECORDINGS_DIR, `${caseObj.id}.json`);
        if (!fs.existsSync(recFile)) throw new Error('Recording not found');
        const rec = JSON.parse(fs.readFileSync(recFile, 'utf8'));
        Object.assign(agentResponses, rec.responses || {});
      } catch (e) {
        result.error = `Replay failed: ${e.message}`;
      }
      finish();
      return;
    }

    // Live mode: connect to server
    const ws = new WebSocket(URL);

    let finishedFlag = false;
    const safety = setTimeout(() => {
      if (!finishedFlag) {
        result.error = result.error || 'timeout';
        finishedFlag = true;
        finish();
        try { ws.close(); } catch {}
      }
    }, caseObj.timeout || 20000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'init_ensemble' }));
      ws.send(JSON.stringify({ type: 'ensemble_chat', task: caseObj.prompt, agents: caseObj.agents || ['Code Generation'], mode: 'parallel', sessionKey: `eval-${caseObj.id}` }));
    });

    ws.on('message', (data) => {
      if (finishedFlag) return;
      let msg;
      try { msg = JSON.parse(data.toString()); } catch { return; }
      if (msg.type === 'agent_token') {
        agentResponses[msg.agent] = (agentResponses[msg.agent] || '') + msg.token;
      }
      if (msg.type === 'agent_complete') {
        agentResponses[msg.agent] = (agentResponses[msg.agent] || '') + (msg.response || '');
      }
      if (msg.type === 'agent_error') {
        result.error = msg.error;
      }
      if (msg.type === 'ensemble_complete') {
        finishedFlag = true;
        clearTimeout(safety);
        finish();
      }
    });

    ws.on('error', (err) => {
      result.error = err.message;
      finishedFlag = true;
      clearTimeout(safety);
      finish();
    });
  });
}

async function runAll() {
  const allResults = [];
  for (const c of cases) {
    console.log(`Running case ${c.id}...`);
    const res = await runCase(c);
    allResults.push(res);
    try { fs.writeFileSync(OUT_PATH, JSON.stringify(allResults, null, 2)); } catch (e) { /* ignore */ }
  }
  console.log(`Evaluation complete — results saved to ${OUT_PATH}`);
  return allResults;
}

async function runRegress() {
  // ensure recordings exist
  for (const c of cases) {
    const rec = path.join(RECORDINGS_DIR, `${c.id}.json`);
    if (!fs.existsSync(rec)) {
      console.error(`Missing recording for case ${c.id}. Run with --record first.`);
      process.exit(1);
    }
  }

  const script = process.argv[1];
  const headOut = path.resolve('./we/eval/results_head.json');
  const mainOut = path.resolve('./we/eval/results_main.json');

  console.log('Running replay against HEAD...');
  execSync(`${process.execPath} "${script}" --replay --out "${headOut}"`, { stdio: 'inherit' });

  // capture git state
  const origRef = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  const dirty = execSync('git status --porcelain').toString().trim();
  let didStash = false;
  if (dirty) {
    console.log('Stashing local changes...');
    execSync('git stash push -u -m "eval-regress-stash"', { stdio: 'inherit' });
    didStash = true;
  }

  try {
    console.log('Checking out main (origin/main)...');
    try {
      execSync('git fetch origin main', { stdio: 'inherit' });
      execSync('git checkout main', { stdio: 'inherit' });
    } catch (e) {
      // fallback to detached origin/main
      execSync('git checkout origin/main', { stdio: 'inherit' });
    }

    console.log('Running replay against main...');
    execSync(`${process.execPath} "${script}" --replay --out "${mainOut}"`, { stdio: 'inherit' });

  } finally {
    console.log(`Restoring original ref ${origRef}...`);
    try { execSync(`git checkout ${origRef}`, { stdio: 'inherit' }); } catch (e) { /* ignore */ }
    if (didStash) {
      console.log('Popping stash...');
      try { execSync('git stash pop', { stdio: 'inherit' }); } catch (e) { console.warn('Failed to pop stash'); }
    }
  }

  // compare results
  const head = JSON.parse(fs.readFileSync(headOut, 'utf8'));
  const main = JSON.parse(fs.readFileSync(mainOut, 'utf8'));
  const byId = (arr) => Object.fromEntries((arr || []).map(r => [r.id, r]));
  const H = byId(head);
  const M = byId(main);

  console.log('\nRegression report:\n');
  console.log('| Case | Main | HEAD | Change |');
  console.log('|---|---:|---:|---|');
  for (const c of cases) {
    const mid = M[c.id];
    const hid = H[c.id];
    const mainPass = mid && mid.passed;
    const headPass = hid && hid.passed;
    let change = '─';
    if (mainPass && !headPass) change = '❌ REGRESSION';
    if (!mainPass && headPass) change = '✅ IMPROVED';
    const mainSym = mainPass ? '✅ Pass' : '❌ Fail';
    const headSym = headPass ? '✅ Pass' : '❌ Fail';
    console.log(`| ${c.id} | ${mainSym} | ${headSym} | ${change} |`);
  }
}

(async () => {
  if (REGRESS_MODE) {
    await runRegress();
    process.exit(0);
  }
  await runAll();
})();
