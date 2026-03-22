/**
 * S:\workspace Infer Server
 * 
 * HTTP server that exposes the /infer endpoint for Oracle to call
 * This is the "Muscle" part of the Oracle (Brain) + Cockpit (Muscle) architecture
 * 
 * Run: node server.js
 * 
 * Endpoints:
 * - POST /api/infer - Model inference
 * - GET  /api/infer/health - Health check
 * - GET  /api/infer/models - List available models
 */

const http = require('http');
const { handleInfer, handleHealth, handleModels } = require('./routes/api/infer');

const PORT = process.env.PORT || 3847; // Different port to avoid conflicts
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Parse JSON body from request
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

/**
 * Create HTTP response
 */
function sendResponse(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

/**
 * Handle CORS preflight
 */
function handleCors(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end();
}

/**
 * Main request handler
 */
async function handleRequest(req, res) {
  const url = req.url.split('?')[0];
  const method = req.method;

  console.log(`[server] ${method} ${url}`);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return handleCors(res);
  }

  try {
    // Route: POST /api/infer
    if (method === 'POST' && url === '/api/infer') {
      const body = await parseBody(req);
      return handleInfer({ body }, res);
    }

    // Route: GET /api/infer/health
    if (method === 'GET' && url === '/api/infer/health') {
      return handleHealth({ query: {} }, res);
    }

    // Route: GET /api/infer/models
    if (method === 'GET' && url === '/api/infer/models') {
      return handleModels({ query: {} }, res);
    }

    // 404 for unknown routes
    sendResponse(res, 404, {
      success: false,
      error: 'Not Found',
      message: `No route for ${method} ${url}`
    });

  } catch (error) {
    console.error(`[server] Error: ${error.message}`);
    sendResponse(res, 500, {
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

// Create and start server
const server = http.createServer(handleRequest);

server.listen(PORT, HOST, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║   S:\\workspace Infer Server - Running                     ║
║                                                           ║
║   Host: http://${HOST}:${PORT}                        ║
║                                                           ║
║   Endpoints:                                             ║
║   - POST /api/infer         Model inference              ║
║   - GET  /api/infer/health  Health check                 ║
║   - GET  /api/infer/models  List available models       ║
║                                                           ║
║   Oracle can connect to this endpoint for local inference║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[server] Shutting down...');
  server.close(() => {
    console.log('[server] Server stopped');
    process.exit(0);
  });
});
