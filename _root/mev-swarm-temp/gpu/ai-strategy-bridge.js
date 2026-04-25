#!/usr/bin/env node
// ai-strategy-bridge.js
// Watches we/eval/swarm_cuda_advice.json and forwards updates to Redis or an orchestrator endpoint.

const fs = require('fs');
const path = require('path');
const http = require('http');

const advicePath = path.join(__dirname, '..', 'we', 'eval', 'swarm_cuda_advice.json');
console.log('Watching for', advicePath);

let lastData = null;

function tryPublish(report) {
  // Try Redis if available
  const REDIS_URL = process.env.REDIS_URL;
  if (REDIS_URL) {
    try {
      const Redis = require('ioredis');
      const r = new Redis(REDIS_URL);
      r.publish('swarm_cuda_advice', JSON.stringify(report)).then(() => {
        console.log('Published advice to Redis channel swarm_cuda_advice');
        r.quit();
      }).catch((e) => { console.warn('Redis publish failed', e.message); r.quit(); });
      return;
    } catch (e) {
      console.warn('ioredis not available or publish failed:', e.message);
    }
  }

  // Try HTTP endpoint
  const ORCH = process.env.ORCHESTRATOR_URL;
  if (ORCH) {
    const data = JSON.stringify(report);
    const url = new URL(ORCH);
    const opts = { method: 'POST', hostname: url.hostname, port: url.port || 80, path: url.pathname, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
    const req = http.request(opts, res => {
      console.log(`Orchestrator responded ${res.statusCode}`);
    });
    req.on('error', err => console.warn('Orchestrator POST failed', err.message));
    req.write(data);
    req.end();
    return;
  }

  // Fallback: write a local signal file
  const signalPath = path.join(__dirname, '..', 'we', 'eval', 'swarm_cuda_advice.signal');
  fs.writeFile(signalPath, JSON.stringify(report), (err) => {
    if (err) return console.warn('Failed to write signal file', err.message);
    console.log('Wrote local signal file', signalPath);
  });
}

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
    console.warn('Error reading/parsing advice file:', e.message);
  }
});

process.on('SIGINT', () => { console.log('Exiting'); process.exit(0); });
