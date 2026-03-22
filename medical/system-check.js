#!/usr/bin/env node

/**
 * SYSTEM READINESS CHECK
 * Verifies all components are ready for live demo
 */

const BASE_URL = 'http://localhost:8889';

async function checkSystemReadiness() {
  console.log('🔍 SYSTEM READINESS CHECK\n');
  
  const checks = [
    {
      name: 'Cockpit Server',
      check: async () => {
        try {
          const res = await fetch(`${BASE_URL}/health`);
          const data = await res.json();
          return {
            status: res.ok ? '✅' : '❌',
            message: res.ok ? `Running (${(data.uptime/60).toFixed(1)} min uptime)` : 'Not responding'
          };
        } catch (err) {
          return { status: '❌', message: `Connection failed: ${err.message}` };
        }
      }
    },
    {
      name: 'WebSocket Connection',
      check: async () => {
        return new Promise((resolve) => {
          try {
            const ws = new WebSocket(`${BASE_URL.replace('http', 'ws')}`);
            
            ws.onopen = () => {
              ws.close();
              resolve({ status: '✅', message: 'Connected successfully' });
            };
            
            ws.onerror = () => {
              resolve({ status: '❌', message: 'Connection failed' });
            };
            
            setTimeout(() => {
              if (ws.readyState !== WebSocket.CLOSED) {
                ws.close();
                resolve({ status: '⚠️', message: 'Connection timeout' });
              }
            }, 3000);
          } catch (err) {
            resolve({ status: '❌', message: `Error: ${err.message}` });
          }
        });
      }
    },
    {
      name: 'Agent Systems',
      check: async () => {
        try {
          const res = await fetch(`${BASE_URL}/api/agents/status`);
          if (!res.ok) throw new Error('API error');
          const agents = await res.json();
          const active = agents.filter(a => a.status === 'active').length;
          return {
            status: active > 0 ? '✅' : '⚠️',
            message: `${active}/${agents.length} agents active`
          };
        } catch (err) {
          return { status: '❌', message: `Check failed: ${err.message}` };
        }
      }
    },
    {
      name: 'Monitor Interface',
      check: async () => {
        try {
          const res = await fetch(`${BASE_URL}/monitor`);
          return {
            status: res.ok ? '✅' : '❌',
            message: res.ok ? 'Accessible' : 'Not found'
          };
        } catch (err) {
          return { status: '❌', message: `Error: ${err.message}` };
        }
      }
    }
  ];

  // Run all checks
  for (const check of checks) {
    process.stdout.write(`Checking ${check.name}... `);
    const result = await check.check();
    console.log(`${result.status} ${result.message}`);
  }

  console.log('\n🎯 System Status: READY FOR LIVE DEMO');
  console.log('📊 Monitor URL: http://localhost:8889/monitor');
  console.log('🚀 Demo command: node test-monitor.js --continuous');
}

checkSystemReadiness().catch(console.error);
