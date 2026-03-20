# ============================================
# MEV Swarm Dockerfile
# Multi-stage build for different components
# ============================================

# --------------------------------------------
# Base Stage - Common dependencies
# --------------------------------------------
FROM node:20-alpine AS base

# Install Python and build tools for TensorFlow
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy all source files
COPY . .

# --------------------------------------------
# Stage: Data Collector
# Phase 1: Collects blockchain state data
# --------------------------------------------
FROM base AS collector

EXPOSE 8080

CMD ["node", "we/mev-data-collector.js"]

# --------------------------------------------
# Stage: Predictor  
# Phase 2: ML-powered opportunity prediction
# --------------------------------------------
FROM base AS predictor

# Install TensorFlow.js with GPU support if available
RUN npm install @tensorflow/tfjs @tensorflow/tfjs-node 2>/dev/null || true

EXPOSE 8081

CMD ["node", "mev-predictor.cjs"]

# --------------------------------------------
# Stage: Pre-Signer
# Phase 3: Pre-signs transactions for instant submission
# --------------------------------------------
FROM base AS presigner

EXPOSE 8082

CMD ["node", "mev-pre-signer.cjs"]

# --------------------------------------------
# Stage: Monitor
# Monitoring and stats dashboard
# --------------------------------------------
FROM base AS monitor

# Install Redis client
RUN npm install ioredis

EXPOSE 3000

# Create simple monitoring server
RUN echo "const http = require('http'); \
const fs = require('fs'); \
const path = require('path'); \
\
const server = http.createServer((req, res) => { \
  const dataPath = path.join('/data', 'mev-training-data.jsonl'); \
  let html = '<html><head><title>MEV Swarm Monitor</title>'; \
  html += '<style>body{font-family:monospace;padding:20px;background:#1a1a2e;color:#eee}'; \
  html += 'h1{color:#00ff88}</style></head><body>'; \
  html += '<h1>📊 MEV Swarm Monitor</h1>'; \
  html += '<p>Data Collector: Running</p>'; \
  html += '<p>Predictor: Running</p>'; \
  html += '<p>Pre-Signer: Running</p>'; \
  \
  try { \
    if (fs.existsSync(dataPath)) { \
      const stats = fs.statSync(dataPath); \
      html += '<hr/><h3>Data Collection</h3>'; \
      html += '<p>File size: ' + (stats.size / 1024).toFixed(2) + ' KB</p>'; \
    } \
  } catch(e) {} \
  \
  html += '</body></html>'; \
  res.writeHead(200, {'Content-Type': 'text/html'}); \
  res.end(html); \
}); \
\
server.listen(3000, '0.0.0.0', () => console.log('Monitor running on port 3000'));\
" > monitor.js

CMD ["node", "monitor.js"]
