#!/usr/bin/env node

/**
 * ULTIMATE SYSTEM CHAOS - YOLO MODE
 * Maximum stress test pushing everything to absolute limits
 */

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const BASE_URL = 'http://localhost:8889';

if (cluster.isMaster) {
  console.log('👹 ULTIMATE CHAOS MASTER CONTROLLER INITIATED');
  console.log('===========================================');
  console.log(`Spawning ${numCPUs} worker processes for maximum destruction...`);
  console.log('WARNING: SYSTEM WILL BE PUSHED TO ABSOLUTE LIMITS!');
  console.log('');
  
  // Spawn worker processes
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  let completedWorkers = 0;
  
  cluster.on('message', (worker, message) => {
    if (message.status === 'WORKER_COMPLETE') {
      completedWorkers++;
      console.log(`✅ Worker ${message.worker} completed chaos cycle`);
      
      if (completedWorkers === numCPUs) {
        console.log('\n🔥 ALL WORKERS FINISHED - CHAOS PEAK REACHED!');
        console.log('=============================================');
        process.exit(0);
      }
    }
  });
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`💀 Worker ${worker.process.pid} died (${signal || code})`);
  });
  
  // Coordinate maximum chaos
  setInterval(() => {
    Object.values(cluster.workers).forEach(worker => {
      try {
        worker.send({ cmd: 'MAX_CHAOS', timestamp: Date.now() });
      } catch (e) {
        // Worker died, ignore
      }
    });
  }, 50); // Send chaos commands every 50ms
  
  setTimeout(() => {
    console.log('\n⏰ CHAOS DURATION COMPLETE - FINALIZING...');
    Object.values(cluster.workers).forEach(worker => {
      try {
        worker.kill();
      } catch (e) {
        // Already dead
      }
    });
  }, 30000); // 30 second chaos session
  
} else {
  // Worker process
  process.on('message', async (message) => {
    if (message.cmd === 'MAX_CHAOS') {
      // Execute maximum chaos operations
      const chaosPromises = [];
      
      // Flood API endpoints
      for (let i = 0; i < 50; i++) {
        chaosPromises.push(
          fetch(`${BASE_URL}/api/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              task: {
                type: 'maximum_chaos',
                data: {
                  workerId: cluster.worker.id,
                  iteration: i,
                  timestamp: message.timestamp,
                  chaosLevel: 'EXTREME'
                }
              },
              preferredSystem: 'all_agents'
            })
          }).catch(() => 'FAILED')
        );
      }
      
      // Hit agent endpoints directly
      const agents = ['code', 'data', 'clinical', 'test', 'security'];
      agents.forEach(agent => {
        for (let i = 0; i < 20; i++) {
          chaosPromises.push(
            fetch(`${BASE_URL}/api/agents/${agent}/execute`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                task: {
                  type: 'chaos_bomb',
                  data: {
                    target: agent,
                    intensity: 'maximum',
                    worker: cluster.worker.id
                  }
                }
              })
            }).catch(() => 'FAILED')
          );
        }
      });
      
      // Execute all promises without waiting
      Promise.all(chaosPromises).then(() => {
        process.send({ status: 'WORKER_COMPLETE', worker: cluster.worker.id });
      });
    }
  });
  
  console.log(`👾 Worker ${cluster.worker.id} ready for chaos`);
}
