/**
 * Dedicated Server for Autonomous Elasticsearch Evolution Agent
 * Ensures proper connectivity for Azure Dev Tunnel (local:8000 → remote:3000)
 * Implements the 14-phase autonomous architecture with all cosmic arcs
 */
import { MessagePasser } from './message-passers.js';
import { CommunicationMonitor } from './communication-monitor.js';

import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { ElasticsearchSearchOptimizer } from './elasticsearch-search-optimizer.js';
import { ElasticsearchMetricsCollector } from './elasticsearch-metrics-collector.js';
import { ResearchAgent } from './research-agent.js';
import { CodingAgent } from './coding-agent.js';
import { PersistentMemory } from './persistent-memory.js';


// Setup for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const server = createServer(app);

// Setup WebSocket server
const wss = new WebSocketServer({ server });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve dashboard HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Store latest data for new WebSocket connections
let latestMetrics = null;
let latestOptimizations = [];
let latestInsights = [];

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('New dashboard client connected');
  
  // Send initial data to new client
  if (latestMetrics) {
    ws.send(JSON.stringify({ type: 'metrics', data: latestMetrics }));
  }
  
  if (latestOptimizations.length > 0) {
    ws.send(JSON.stringify({ type: 'optimizations', data: latestOptimizations.slice(-10) })); // Last 10
  }
  
  if (latestInsights.length > 0) {
    ws.send(JSON.stringify({ type: 'insights', data: latestInsights.slice(-10) })); // Last 10
  }
  
  // Send periodic updates
  const interval = setInterval(() => {
    if (latestMetrics) {
      ws.send(JSON.stringify({ type: 'metrics', data: latestMetrics }));
    }
  }, 5000); // Every 5 seconds
  
  // Handle client disconnect
  ws.on('close', () => {
    clearInterval(interval);
    console.log('Dashboard client disconnected');
  });
});

// Function to broadcast metrics to all clients
function broadcastMetrics(metrics) {
  latestMetrics = metrics;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'metrics', data: metrics }));
    }
  });
}

// Function to broadcast optimizations to all clients
function broadcastOptimization(opt) {
  latestOptimizations.push({...opt, timestamp: Date.now()});
  if (latestOptimizations.length > 50) {
    latestOptimizations = latestOptimizations.slice(-50);
  }
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'optimization', data: opt }));
    }
  });
}

// Function to broadcast insights to all clients
function broadcastInsight(insight) {
  latestInsights.push({...insight, timestamp: Date.now()});
  if (latestInsights.length > 50) {
    latestInsights = latestInsights.slice(-50);
  }
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'insight', data: insight }));
    }
  });
}

// Function to broadcast system status
function broadcastStatus(status) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'status', data: status }));
    }
  });
}

// Initialize persistent memory
const persistentMemory = new PersistentMemory({ 
  storagePath: './memory-store.json' 
});

try {
  await persistentMemory.load();
  console.log("Persistent memory initialized successfully");
} catch (error) {
  console.error("Failed to initialize persistent memory:", error);
}

// Create ES client (using fake connection for demo purposes)
import { Client } from '@elastic/elasticsearch';
const esClient = new Client({ node: 'http://localhost:9200' });

// Initialize components with persistent memory
const metricsCollector = new ElasticsearchMetricsCollector(esClient, { 
  clusterName: 'demo-cluster',
  persistentMemory: persistentMemory
});

const optimizer = new ElasticsearchSearchOptimizer(esClient, { 
  clusterName: 'demo-cluster', 
  autonomyLevel: 'supervised',
  persistentMemory: persistentMemory
});

// Initialize research and coding agents
const researchAgent = new ResearchAgent({ 
  agentId: 'research-agent-1',
  persistentMemory: persistentMemory 
});

const codingAgent = new CodingAgent({ 
  agentId: 'coding-agent-1', 
  persistentMemory: persistentMemory 
});

// Initialize message passing system
const messagePasser = new MessagePasser();
const communicationMonitor = new CommunicationMonitor(messagePasser);

// Add event handlers for research agent
messagePasser.subscribe('metrics-update', async (message) => {
  console.log(`[Research Agent] Received metrics update from ${message.sender}`);
  
  try {
    // Generate research report based on metrics
    const report = await researchAgent.generateResearchReport(message.content.data);
    
    // Send report to coding agent
    messagePasser.sendMessage({
      type: 'research-report',
      sender: 'research-agent',
      receiver: 'coding-agent',
      content: {
        report,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('[Research Agent] Error processing metrics:', error);
  }
});

// Add event handlers for coding agent
messagePasser.subscribe('research-report', async (message) => {
  console.log(`[Coding Agent] Received research report from ${message.sender}`);
  
  try {
    // Generate code from research insights
    const codeSnippets = await codingAgent.generateCodeFromInsights(message.content.report);
    
    // Send generated code back to research agent for validation
    messagePasser.sendMessage({
      type: 'generated-code',
      sender: 'coding-agent',
      receiver: 'research-agent',
      content: {
        codeSnippets,
        reportRef: message.content.report.timestamp,
        timestamp: Date.now()
      }
    });
    
    // Also send to optimizer for potential execution
    messagePasser.sendMessage({
      type: 'optimization-suggestions',
      sender: 'coding-agent',
      receiver: 'optimizer',
      content: {
        suggestions: codeSnippets,
        reportRef: message.content.report.timestamp,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('[Coding Agent] Error generating code:', error);
  }
});

// Add handler for optimization suggestions
messagePasser.subscribe('optimization-suggestions', async (message) => {
  console.log(`[Optimizer] Received ${message.content.suggestions.length} optimization suggestions`);
  
  // Run an optimization cycle with the suggestions
  try {
    const result = await optimizer.runPhase9Cycle('suggestion-cycle', {
      health: { status: 'yellow' },
      calculated: { 
        memoryUsage: 0.85, 
        indexFragmentation: 4.5, 
        queryLatency: 0.8,
        shardHealth: 0.65
      }
    });
    
    console.log(`[Optimizer] Completed optimization cycle with result:`, result.success);
  } catch (error) {
    console.error('[Optimizer] Error running optimization cycle:', error);
  }
});

// Start the system
console.log("🚀 Starting Autonomous Elasticsearch Evolution Agent with Multi-Agent Communication");

// Initialize agents
await Promise.all([
  researchAgent.initialize(),
  codingAgent.initialize(),
  optimizer.initialize(),
  metricsCollector.initialize()
]);

// Run initial optimization cycle
await optimizer.runPhase9Cycle('initial-cycle');

// Periodically collect metrics and send to research agent

// Periodically collect metrics, send to research agent, and broadcast to dashboard
setInterval(async () => {
  try {
    const metrics = await metricsCollector.collectMetrics();
    // Send to research agent as before
    messagePasser.sendMessage({
      type: 'metrics-update',
      sender: 'metrics-collector',
      receiver: 'research-agent',
      content: {
        timestamp: Date.now(),
        data: metrics
      }
    });
    // Broadcast to dashboard WebSocket
    broadcastMetrics(metrics);
  } catch (error) {
    console.error('Error collecting metrics:', error);
  }
}, 60000); // Every minute

// Print communication monitor summary every 5 minutes
setInterval(() => {
  communicationMonitor.printSummary();
}, 300000);

// Start the server on port 3000
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Autonomous Elasticsearch Evolution Agent Dashboard Server running on port ${PORT}`);
  console.log(`Access via Azure Dev Tunnel: Forward local port 8000 to remote port ${PORT}`);
  console.log('Ready for local development and remote access...');
});

// Export for testing
export { 
  server, 
  broadcastMetrics, 
  broadcastOptimization, 
  broadcastInsight, 
  broadcastStatus,
  wss 
};