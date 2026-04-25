#!/usr/bin/env node
// ai-strategy-bridge-updated.js
// Improved bridge: supports one-shot publish mode (for CI), Redis health-check (ping), HTTP endpoint, and local fallback.

const fs = require('fs');
const path = require('path');
const http = require('http');

const advicePath = path.join(__dirname, '..', 'we', 'eval', 'swarm_cuda_advice.json');
console.log('Bridge (updated) watching for', advicePath);

let lastData = null;

async function publishToRedis(report) {
  const REDIS_URL = process.env.REDIS_URL;
  if (!REDIS_URL) return false;
  try {
    const Redis = require('ioredis');
    const r = new Redis(REDIS_URL);
    const pong = await r.ping();
    if (pong !== 'PONG') {
      console.warn('Redis ping did not respond PONG:', pong);
      try { r.quit(); } catch (e) {}
      return false;
    }
    await r.publish('snac:cuda:advice', JSON.stringify(report));
    console.log('Published advice to Redis channel snac:cuda:advice');
    await r.quit();
    return true;
  } catch (e) {
    console.warn('Redis publish failed:', e && e.message ? e.message : e);
    return false;
  }
}

function publishToOrchestrator(report) {
  const ORCH = process.env.ORCHESTRATOR_URL;
  if (!ORCH) return false;
  try {
    const data = JSON.stringify(report);
    const url = new URL(ORCH);
    const opts = { method: 'POST', hostname: url.hostname, port: url.port || 80, path: url.pathname, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
    const req = http.request(opts, res => {
      console.log(`Orchestrator responded ${res.statusCode}`);
    });
    req.on('error', err => console.warn('Orchestrator POST failed', err.message));
    req.write(data);
    req.end();
    return true;
  } catch (e) {
    console.warn('Orchestrator publish failed:', e && e.message ? e.message : e);
    return false;
  }
}

function writeSignal(report) {
  try {
    const signalPath = path.join(__dirname, '..', 'we', 'eval', 'swarm_cuda_advice.signal');
    fs.writeFileSync(signalPath, JSON.stringify(report));
    console.log('Wrote local signal file', signalPath);
    return true;
  } catch (e) {
    console.warn('Failed to write signal file', e && e.message ? e.message : e);
    return false;
  }
}

async function tryPublish(report) {
  // Attempt Redis
  if (await publishToRedis(report)) return;
  // Attempt orchestrator
  if (publishToOrchestrator(report)) return;
  // Fallback local file
  writeSignal(report);
}

function readAndMaybePublishOnce() {
  if (!fs.existsSync(advicePath)) {
    console.warn('Advice file not found:', advicePath);
    return;
  }
  try {
    const txt = fs.readFileSync(advicePath, 'utf8');
    const data = JSON.parse(txt);
    const serialized = JSON.stringify(data);
    if (serialized === lastData) {
      console.log('No change in advice data');
      return;
    }
    lastData = serialized;
    console.log('Detected new advice data:', data);
    tryPublish(data);
  } catch (e) {
    console.warn('Error reading/parsing advice file:', e && e.message ? e.message : e);
  }
}

async function main() {
  const oneShot = !!process.env.BRIDGE_ONESHOT;
  if (oneShot) {
    readAndMaybePublishOnce();
    // give async publishers a moment
    setTimeout(() => process.exit(0), 1500);
    return;
  }

  // watch mode
  fs.watchFile(advicePath, { interval: 1000 }, (curr, prev) => {
    if (curr.mtimeMs === prev.mtimeMs) return;
    try {
      const txt = fs.readFileSync(advicePath, 'utf8');
      const data = JSON.parse(txt);
      const serialized = JSON.stringify(data);
      if (serialized === lastData) return;
      lastData = serialized;
      console.log('Detected new swarm_cuda_advice.json:', data);
      tryPublish(data);
    } catch (e) {
      console.warn('Error reading/parsing advice file:', e && e.message ? e.message : e);
    }
  });

  process.on('SIGINT', () => { console.log('Exiting'); process.exit(0); });
}

main();
