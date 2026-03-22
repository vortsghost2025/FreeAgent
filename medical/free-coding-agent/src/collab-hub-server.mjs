/**
 * Collaboration Hub Server
 * Real-time communication hub for multi-platform agents (VS Code, LM Arena, etc.)
 * Supports WebSocket for instant updates and REST API for polling
 */


import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuration constants
const MAX_MESSAGES = 100;
const MESSAGE_RETENTION_MINUTES = 60; // Only keep messages from last hour
const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

// Message store with metadata for better management
const messages = {
  'vscode-agents': [],
  'lmarena-agents': [],
  'shared': []
};

// Utility function to check if message is expired
function isMessageExpired(message) {
  const now = new Date();
  const messageTime = new Date(message.timestamp);
  const diffMinutes = (now - messageTime) / (1000 * 60);
  return diffMinutes > MESSAGE_RETENTION_MINUTES;
}

// Function to prune expired messages
function pruneExpiredMessages() {
  for (const platform in messages) {
    messages[platform] = messages[platform].filter(msg => !isMessageExpired(msg));
  }
}

// Periodic cleanup of expired messages
setInterval(pruneExpiredMessages, 5 * 60 * 1000); // Every 5 minutes

// WebSocket server
// Broadcast function with error handling
function safeBroadcast(broadcastMessage) {
  const messageStr = JSON.stringify(broadcastMessage);
  
  wss.clients.forEach((client) => {
    try {
      if (client.readyState === WebSocketServer.OPEN) {
        client.send(messageStr);
      }
    } catch (err) {
      console.error('Error broadcasting to client:', err);
      // Attempt to close problematic connection
      try {
        client.terminate();
      } catch (closeErr) {
        console.error('Error terminating client connection:', closeErr);
      }
    }
  });
}

// WebSocket server with enhanced configuration
const wss = new WebSocketServer({ 
  server, 
  path: '/ws',
  maxPayload: 1024 * 1024, // 1MB max payload
  verifyClient: (info) => {
    console.log(`Client attempting to connect: ${info.origin}`);
    return true;
  }
});

wss.on('connection', (ws, req) => {
  console.log('New collaboration hub client connected:', req.url);
  // Send initial messages
  ws.send(JSON.stringify({
    type: 'init',
    messages: messages
  }));

  // Heartbeat mechanism to detect dead connections
  let heartbeatTimeout;
  
  function heartbeat() {
    clearTimeout(heartbeatTimeout);
    // Wait for pong response
    heartbeatTimeout = setTimeout(() => {
      console.log('Client heartbeat timeout, terminating connection');
      ws.terminate();
    }, HEARTBEAT_INTERVAL_MS * 2);
  }
  
  // Start heartbeat when connection opens
  heartbeat();
  
  // Handle pong responses
  ws.on('pong', heartbeat);
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === 'post-message') {
        const { platform, sender, content, timestamp = new Date().toISOString() } = message;
        if (!platform || !sender || !content) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Missing required fields: platform, sender, content'
          }));
          return;
        }
        
        const newMessage = {
          id: Date.now() + Math.random(),
          platform,
          sender,
          content,
          timestamp
        };
        
        if (messages.hasOwnProperty(platform)) {
          messages[platform].push(newMessage);
          // Prune if over limit
          if (messages[platform].length > MAX_MESSAGES) {
            messages[platform].shift();
          }
        } else {
          messages.shared.push(newMessage);
          // Prune if over limit
          if (messages.shared.length > MAX_MESSAGES) {
            messages.shared.shift();
          }
        }
        
        const broadcastMessage = {
          type: 'new-message',
          message: newMessage
        };
        
        // Use safe broadcast to handle client errors
        safeBroadcast(broadcastMessage);
      } else if (message.type === 'ping') {
        // Respond to ping with pong
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      try {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      } catch (sendErr) {
        console.error('Error sending error message to client:', sendErr);
      }
    }
  });
  
  ws.on('close', (code, reason) => {
    console.log(`Client disconnected from collaboration hub (code: ${code}, reason: ${reason})`);
    clearTimeout(heartbeatTimeout);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('Client disconnected from collaboration hub');
  });
});

// REST API endpoints
app.get('/api/messages', (req, res) => {
  // Apply message pruning before responding
  pruneExpiredMessages();
  res.json(messages);
});

app.get('/api/messages/:platform', (req, res) => {
  const platform = req.params.platform;
  if (messages.hasOwnProperty(platform)) {
    // Apply message pruning before responding
    pruneExpiredMessages();
    res.json(messages[platform]);
  } else {
    res.status(404).json({ error: `Platform '${platform}' not found` });
  }
});

app.post('/api/messages', (req, res) => {
  const { platform, sender, content, timestamp = new Date().toISOString() } = req.body;
  if (!platform || !sender || !content) {
    return res.status(400).json({
      error: 'Missing required fields: platform, sender, content'
    });
  }
  
  const newMessage = {
    id: Date.now() + Math.random(),
    platform,
    sender,
    content,
    timestamp
  };
  
  if (messages.hasOwnProperty(platform)) {
    messages[platform].push(newMessage);
    if (messages[platform].length > MAX_MESSAGES) {
      messages[platform].shift();
    }
  } else {
    messages.shared.push(newMessage);
    if (messages.shared.length > MAX_MESSAGES) {
      messages.shared.shift();
    }
  }
  
  const broadcastMessage = {
    type: 'new-message',
    message: newMessage
  };
  
  // Use safe broadcast to handle client errors
  safeBroadcast(broadcastMessage);
  
  res.status(201).json(newMessage);
});

app.delete('/api/messages/:platform', (req, res) => {
  const platform = req.params.platform;
  if (messages.hasOwnProperty(platform)) {
    messages[platform] = [];
    res.json({ message: `Cleared messages for platform '${platform}'` });
  } else {
    res.status(404).json({ error: `Platform '${platform}' not found` });
  }
});

const PORT = process.env.PORT || 4000; // Changed to 4000 to match the architecture diagram
// Periodically send heartbeat to all clients
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocketServer.OPEN) {
      ws.ping();
    }
  });
}, HEARTBEAT_INTERVAL_MS);

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
  clearInterval(interval);
  wss.close(() => {
    console.log('WebSocket server closed.');
  });
  server.close(() => {
    console.log('HTTP server closed.');
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Collaboration Hub Server running on port ${PORT}`);
  console.log(`\n📋 Available Endpoints:`);
  console.log(`   GET    /api/messages                    - Get all messages`);
  console.log(`   GET    /api/messages/:platform          - Get messages for specific platform`);
  console.log(`   POST   /api/messages                    - Post a new message`);
  console.log(`   DELETE /api/messages/:platform          - Clear messages for platform`);
  console.log(`\n🌐 WebSocket Endpoint:`);
  console.log(`   ws://localhost:${PORT}/ws              - Real-time message updates`);
  console.log(`\n🎯 Platform Options:`);
  console.log(`   'vscode-agents'                       - VS Code agents`);
  console.log(`   'lmarena-agents'                      - LM Arena agents`);
  console.log(`   'shared'                              - Shared messages`);
  console.log(`\n💡 Usage:`);
  console.log(`   - Open collab-hub.html in your browser`);
  console.log(`   - Connect agents to WebSocket endpoint`);
  console.log(`   - Use REST API for programmatic access`);
});