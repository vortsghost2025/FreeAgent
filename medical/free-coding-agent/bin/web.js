#!/usr/bin/env node
import express from "express";
import { WebSocketServer } from "ws";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import { CodingAgent } from "../src/agent.js";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJson = require("../package.json");

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json());

// Prevent favicon 404 errors
app.get('/favicon.ico', (req, res) => res.status(204).end());

// API endpoints
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: packageJson.version });
});

// Health check endpoint (root)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

// Agent task manager HTML page
app.get('/agent-task-manager.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/boot-sequence.html'));
});

// HTTP Chat endpoint for external integrations
app.post("/api/chat", async (req, res) => {
  const { message, provider, model } = req.body;
  
  try {
    const agent = new (await import('../src/agent.js')).CodingAgent({
      provider: provider || "ollama",
      model: model || "llama3.1:8b",
      requiresApproval: false
    });
    
    let response = '';
    for await (const chunk of agent.process(message)) {
      if (chunk.type === 'chunk') {
        response += chunk.content;
      }
    }
    
    res.json({ response });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create WebSocket server
const server = app.listen(port, () => {
  console.log(`Free Coding Agent web server running at http://localhost:${port}`);
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  let agent = null;

  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case "init":
          agent = new CodingAgent({
            provider: message.provider || "ollama",
            model: message.model,
            workingDir: message.workingDir || process.cwd(),
            requiresApproval: false,
            onToolCall: (tool, params, result) => {
              ws.send(
                JSON.stringify({
                  type: "tool_call",
                  tool,
                  params: params,
                  result,
                }),
              );
            },
          });

          const available = await agent.isAvailable();
          ws.send(
            JSON.stringify({
              type: "init",
              success: available,
              error: available
                ? null
                : `Provider not available. Make sure ${message.provider} is configured.`,
            }),
          );
          break;

        case "chat":
          if (!agent) {
            ws.send(
              JSON.stringify({
                type: "error",
                error: "Agent not initialized",
              }),
            );
            return;
          }

          try {
            for await (const event of agent.process(message.content)) {
              if (event.type === "chunk") {
                ws.send(
                  JSON.stringify({
                    type: "chunk",
                    content: event.content,
                  }),
                );
              } else if (event.type === "tool") {
                ws.send(
                  JSON.stringify({
                    type: "tool",
                    tool: event.tool,
                    result: event.result,
                  }),
                );
              } else if (event.type === "complete") {
                ws.send(JSON.stringify({ type: "complete" }));
              }
            }
          } catch (error) {
            ws.send(
              JSON.stringify({
                type: "error",
                error: error.message,
              }),
            );
          }
          break;

        case "reset":
          if (agent) {
            agent.reset();
            ws.send(JSON.stringify({ type: "reset" }));
          }
          break;

        case "models":
          if (agent) {
            const models = await agent.listModels();
            ws.send(
              JSON.stringify({
                type: "models",
                models,
              }),
            );
          }
          break;

        default:
          ws.send(
            JSON.stringify({
              type: "error",
              error: `Unknown message type: ${message.type}`,
            }),
          );
      }
    } catch (error) {
      ws.send(
        JSON.stringify({
          type: "error",
          error: error.message,
        }),
      );
    }
  });

  ws.on("close", () => {
    agent = null;
  });
});