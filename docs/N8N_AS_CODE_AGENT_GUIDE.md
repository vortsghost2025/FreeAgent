# n8n-as-code — Agent Reference Guide

**GitHub:** https://github.com/EtienneLescot/n8n-as-code
**Author:** Etienne Lescot | Apache 2.0 | 491 stars

## What It Solves

Coding agents (Claude Code, Codex, Antigravity) hallucinate n8n configs because they lack full node schemas at inference time. This embeds the entire knowledge base locally:

- 537 node schemas
- 10,209 properties
- 7,702 workflow templates
- Searchable in ~5ms (FlexSearch, offline, no API)

---

## Install

```bash
# CLI quickstart
npx --yes n8nac init
npx --yes n8nac update-ai
```

```bash
# npm packages (programmatic use)
npm install @n8n-as-code/skills @n8n-as-code/transformer
```

---

## MCP Server (add to .vscode/mcp.json or Claude Desktop)

```json
{
  "mcpServers": {
    "n8n-as-code": {
      "command": "npx",
      "args": ["--yes", "n8nac", "skills", "mcp"]
    }
  }
}
```

This gives Claude Code direct access to all 537 node schemas as tools.

---

## Key CLI Commands

```bash
# Search 7,702 templates by natural language (~5ms)
npx n8nac skills search "slack message on sheet update"

# Get full schema for any node
npx n8nac skills node-info slack
npx n8nac skills node-info httpRequest
npx n8nac skills node-info postgres

# Validate workflow before deploying
npx n8nac skills validate workflow.json

# GitOps sync with n8n instance
npx n8nac pull <workflow-id>
npx n8nac push workflow.ts
npx n8nac list
npx n8nac resolve <id> --mode keep-current
```

---

## TypeScript Workflow Format

```typescript
import { workflow, node, links } from '@n8n-as-code/transformer';

@workflow({ id: 'abc123', name: 'Slack Notifier', active: true })
export class SlackNotifierWorkflow {
  @node()
  Trigger = {
    type: 'n8n-nodes-base.webhook',
    parameters: { path: '/notify', method: 'POST' },
    position: [250, 300]
  };

  @node()
  Slack = {
    type: 'n8n-nodes-base.slack',
    parameters: {
      resource: 'message',
      operation: 'post',
      channel: '#alerts',
      text: '={{ $json.message }}'
    },
    position: [450, 300]
  };

  @links([{ from: 'Trigger', to: 'Slack' }])
  connections = {};
}
```

Deploy with: `npx n8nac push workflow.ts`

---

## Agent Workflow (Zero Hallucination)

1. `npx n8nac skills search "what I want to build"` → find template
2. `npx n8nac skills node-info <nodetype>` → get exact parameter schema
3. Write TypeScript using actual schemas (no guessing)
4. `npx n8nac skills validate workflow.json` → verify before deploy
5. `npx n8nac push workflow.ts` → deploy to n8n instance

---

## Package Breakdown

| Package | Purpose |
|---|---|
| `@n8n-as-code/skills` v1.1.2 | Knowledge base, search, MCP server |
| `@n8n-as-code/transformer` v1.0.1 | JSON ↔ TypeScript converter |
| `@n8n-as-code/cli` | Sync, search, validate CLI |

---

## Integration with SNAC Multi-Agent System

- Add MCP server to `.vscode/mcp.json` so all VSCode agents get n8n tools
- Free coding agent ensemble can call `n8nac skills search` as a tool
- SNAC Agent can use node-info to validate before generating workflows
- Store n8n instance URL + API key in `/opt/snac-v2/backend/.env`

```env
N8N_BASE_URL=https://snac.deliberatefederation.cloud/n8n
N8N_API_KEY=5f205806-2e6b-423c-9d71-7aefd7cbb8df
```

---

## Status
- [ ] Install on Windows: `npx --yes n8nac init`
- [ ] Add MCP server to `.vscode/mcp.json`
- [ ] Connect to n8n instance (if running one)
