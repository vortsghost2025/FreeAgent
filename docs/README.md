# FreeAgent Cockpit - Cloud Shell Integration

This directory contains the updated FreeAgent cockpit with Gemini (Vertex AI), Vector Memory, and Multi-Session support.

## Files to Copy to Cloud Shell

Copy the following files from `C:\_bootstrap\cockpit\` to your Cloud Shell cockpit directory (`~/cockpit`):

```
cockpit/
├── server.js          # Main server (REPLACE existing server.js)
├── orchestrator.js    # Core orchestrator module
├── memory.js          # Vector memory store
├── sessions.js       # Multi-session management
├── clients/
│   ├── claudeClient.js
│   ├── localModelClient.js
│   └── geminiClient.js
└── package.json       # Dependencies
```

## Configuration

Set these environment variables before starting:

```bash
# Required for Claude
export CLAUDE_API_KEY=your_anthropic_api_key

# Required for Gemini (Vertex AI)
export GCP_PROJECT=your_gcp_project_id
export GCP_LOCATION=us-central1

# Optional - Local model endpoint
export LOCAL_MODEL_URL=http://localhost:3847

# Optional - Vector embeddings endpoint
export EMBEDDINGS_URL=http://localhost:3847

# Optional - Data paths
export MEMORY_DB_PATH=./data/memory.db
export SESSION_DB_PATH=./data/sessions.db

# Optional - Feature toggles
export MEMORY_ENABLED=true
export SESSION_ENABLED=true
export PREFER_LOCAL=true
```

## Installation

```bash
cd ~/cockpit
npm install
```

## Running

```bash
The server will start on port 4000.

npm start
```

## API Endpoints

### Chat
```
POST /api/chat
{
  "message": "Hello, help me with coding",
  "sessionId": "optional_session_id",
  "history": []
}
```

### Sessions
```
POST /api/sessions        # Create session
GET /api/sessions         # List sessions
GET /api/sessions/:id     # Get session
DELETE /api/sessions/:id  # Delete session
```

### Memory
```
POST /api/memory/search   # Search memory
GET /api/memory/stats     # Get memory stats
```

### Health
```
GET /api/health           # Check system health
```

## WebSocket Messages

### Send Chat Message
```javascript
ws.send(JSON.stringify({
  type: 'orchestrator_chat',
  message: 'Your message here',
  sessionId: 'optional_session_id',
  history: []
}));
```

### Create Session
```javascript
ws.send(JSON.stringify({
  type: 'orchestrator_session_create',
  name: 'Session Name',
  description: 'Optional description'
}));
```

### List Sessions
```javascript
ws.send(JSON.stringify({
  type: 'orchestrator_session_list'
}));
```

### Search Memory
```javascript
ws.send(JSON.stringify({
  type: 'orchestrator_memory_search',
  query: 'search term',
  collection: 'optional_collection',
  limit: 5
}));
```

### Get Health Status
```javascript
ws.send(JSON.stringify({
  type: 'orchestrator_health'
}));
```

## Features

### Gemini Integration (Vertex AI)
- Routes complex reasoning tasks to Gemini
- Uses Google Cloud Project for authentication
- Falls back to Claude if unavailable

### Vector Memory
- Semantic search using embeddings
- Session-specific memory collections
- SQLite persistence (with better-sqlite3)

### Multi-Session Support
- Create named sessions
- Persistent conversation history
- Per-session agent state

### Smart Routing
- Security tasks → Claude
- Complex reasoning → Gemini
- Fast/simple tasks → Local model
