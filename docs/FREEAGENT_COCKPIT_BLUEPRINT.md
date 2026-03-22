# FreeAgent Cockpit Redesign — Consolidated Blueprint

> **Source of Truth Document** — Replaces need to scroll through long chat history
> **Last Updated:** 2026-03-06

---

## 1. Cockpit Purpose and Design Goals

The cockpit is the **human-at-the-helm control surface** for FreeAgent. It provides a stable, ergonomic interface for:

- Issuing tasks
- Inspecting agent reasoning
- Viewing memory and context
- Switching modes
- Monitoring tools
- Debugging
- Managing sessions

**Design Principles:**
- Clarity — every element has a clear purpose
- Isolation — cockpit never contaminates agent context
- Accessibility — agent behavior is always observable and controllable

---

## 2. Core Architecture

The cockpit sits on top of the orchestrator and exposes a structured view of the system.

### Layer Stack

| Layer | Responsibility |
|-------|----------------|
| **UI Layer** | Svelte/SvelteKit front-end with stable panels and predictable layout |
| **Orchestrator API** | `/api/orchestrator`, `/api/memory`, `/api/tools`, `/api/sessions` |
| **Agent Runtime** | Claude, Gemini, Local (S:\workspace), plus tools |
| **State Layer** | Session state, memory retrieval, tool results, logs |

**Key Isolation Rule:** The cockpit never injects unintended instructions into the agent context.

---

## 3. High-Level Cockpit Layout

### Four Persistent Panes

```
┌─────────────────────────────────────────────────────────────────┐
│                         HEADER BAR                               │
├────────────┬────────────────────────────┬──────────────────────┤
│            │                            │                      │
│   LEFT     │         CENTER             │        RIGHT         │
│   PANE     │         PANE               │        PANE         │
│            │                            │                      │
│ - Agents   │ - Natural language         │ - Retrieved memory  │
│ - Tools    │   commands                │ - Embeddings        │
│ - Memory   │ - Structured task         │ - Facts             │
│ - Sessions │   creation                │ - Session context   │
│ - Tasks    │ - Multi-agent             │ - Context blocks    │
│ - Context  │   orchestration           │ - Agent state       │
│   Blocks   │ - Code execution          │ - Environment      │
│ - Environ  │ - Tool invocation         │   manifest          │
│            │                            │                      │
├────────────┴────────────────────────────┴──────────────────────┤
│                      BOTTOM PANE                                 │
│         Backend logs, orchestrator events, tool calls,          │
│         errors, agent reasoning traces                          │
└─────────────────────────────────────────────────────────────────┘
```

### Left Pane — Navigation & Agents

Provides access to:
- **Agents:** Kilo, Claw, Code, Clinical, Data, DB, API, Security, Test
- **Tools**
- **Memory**
- **Sessions**
- **Tasks**
- **Context Blocks**
- **Environment**

Each agent shows:
- Identity
- Specialization
- Last tasks
- Memory shards
- Tool bindings

This mirrors the old `memory/agents/*.json` structure.

### Center Pane — Conversation & Commands

Live interaction surface supporting:
- Natural language commands
- Structured task creation
- Multi-agent orchestration
- Code execution
- Tool invocation
- Memory retrieval

Replaces the old Monaco cockpit and Claw console.

### Right Pane — Memory & Context

Shows:
- Retrieved memory
- Embeddings
- Facts
- Session context
- Context blocks
- Agent state
- Environment manifest

This is where migrated Kilo memory becomes visible.

### Bottom Pane — System Logs

Shows:
- Backend logs
- Orchestrator events
- Tool calls
- Errors
- Agent reasoning traces

Replaces the old Claw debug console.

---

## 4. Session System

Sessions give the cockpit continuity and prevent context bleed.

### Session Data Structure

```json
{
  "id": "uuid",
  "conversation": [
    { "role": "user", "content": "...", "timestamp": "..." },
    { "role": "agent", "content": "...", "timestamp": "..." }
  ],
  "memoryReferences": ["uuid1", "uuid2"],
  "provider": "claude",
  "toolUsage": [...],
  "agentState": {},
  "mode": "autonomous",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Session UI Actions

- **New Session** — Create fresh session
- **Duplicate Session** — Clone existing
- **Archive Session** — Move to long-term storage
- **Switch Session** — Load previous context

**Storage:** SQLite locally, referenced by UUID.

---

## 5. Mode System

### Human-at-the-Helm Mode

- Agent waits for explicit user instructions
- Tools require confirmation
- Memory writes require confirmation
- No autonomous loops

### Autonomous Mode

- Agent can plan multi-step tasks
- Tools can be invoked automatically
- Memory writes are allowed
- Safety rails enforce boundaries

**UI Indicator:** Mode is always visible in the left panel.

---

## 6. Tool System Integration

Tools appear in three places:

| Location | Purpose |
|----------|---------|
| Left panel | Toggles for enabling/disabling tools |
| Center panel | Inline tool call results |
| Right panel | Detailed inspector for each tool |

### Core Tools

- Web search
- Filesystem
- Code execution
- Calculator
- Document parsing

### Tool Call Logging

Each tool call logs:
```json
{
  "id": "uuid",
  "tool": "filesystem",
  "input": { "path": "...", "operation": "read" },
  "output": { "content": "..." },
  "provider": "claude",
  "timestamp": "...",
  "error": null
}
```

---

## 7. Memory System Integration

### Three-Layer Integration

1. **Retrieval** — Before each agent response, orchestrator retrieves relevant memories
2. **Writing** — When agent proposes memory write, cockpit shows proposed content with confidence and category. User can approve/reject (unless autonomous mode)
3. **Browsing** — Right panel includes memory search, stats, inspector, delete/edit options

### Memory Categories

- **episodic** — Specific conversation events
- **procedural** — How to do things
- **semantic** — Factual knowledge
- **working** — Current context

---

## 8. Complete Memory Integration (Unified)

The cockpit integrates all memory layers from the S:\workspace structure:

| Memory Type | Location | Display |
|-------------|----------|--------|
| Vector memory | `vector.sqlite` | Embeddings in right pane |
| Durable memory | `facts.json` | Facts retrieval |
| Session logs | `sessions/` | Session history |
| Agent memory | `agents/*.json` | Per-agent shards |
| Task memory | `tasks/` | Task history |
| Pattern memory | `patterns/` | Pattern definitions |
| Conversation memory | `conversations/` | Chat history |
| Context blocks | `CONTEXT_BLOCKS/` | System guides |

**Right pane shows:**
- What was retrieved
- Why it was retrieved
- Which agent used it
- How it influenced the response

---

## 9. Agent Architecture

Each agent is represented as a module with:
- Identity
- Specialization
- Memory shard
- Toolset
- Last N tasks
- Health status
- Embeddings

**Agent states:**
- Activated
- Paused
- Reset
- Inspected

This mirrors the old Kilo multi-agent system from `memory/agents/`.

---

## 8. Provider Routing Panel

Exposes routing decisions:

- Which provider was chosen
- Why (reasoning)
- Fallback logic
- Latency
- Token usage

**Purpose:** Debug provider behavior and ensure transparency.

---

## 9. Debugging and Introspection

Dedicated debugging layer includes:

- Raw orchestrator logs
- Raw provider responses
- Tool call traces
- Memory embeddings
- Session state dumps
- Environment manifest viewer

**Essential for:** Multi-agent orchestration and safety alignment.

---

## 10. Safety and Boundary Layers

The cockpit enforces:

- Context isolation (no hidden system prompts)
- No devtools overrides
- No cross-session contamination
- Explicit tool permissions
- Explicit memory writes
- Mode-based autonomy limits

### Warning Triggers

- System prompt is overridden
- DevTools modifies the UI
- Agent attempts unauthorized actions

---

## 11. File and Directory Structure

```
/src
  /routes
    /cockpit
      +page.svelte          # Main cockpit page
      +layout.svelte         # Layout wrapper
      /panels
        left.svelte         # Navigation + mode
        center.svelte       # Task + conversation
        right.svelte        # System introspection
      /components
        task-input.svelte   # Task entry
        message.svelte     # Chat messages
        tool-call.svelte    # Tool invocation display
        memory-block.svelte # Memory injection
        session-switcher.svelte
        provider-log.svelte # Provider debugging
  /lib
    /orchestrator           # Core orchestration logic
    /memory                 # Memory retrieval/storage
    /tools                  # Tool definitions
    /providers              # Claude, Gemini, Local
    /sessions               # Session management
```

---

## 12. Interaction Flow

A full cycle:

```
1. User enters task
        ↓
2. Orchestrator retrieves memory
        ↓
3. Provider selected (routing panel updates)
        ↓
4. Agent responds (center panel)
        ↓
5. Tools invoked if needed (expandable in center)
        ↓
6. Memory writes proposed (approval if human mode)
        ↓
7. Session state updated
        ↓
8. All panels refresh
```

**This loop is stable, predictable, and transparent.**

---

## 13. Implementation Roadmap

### Phase 1: Foundation
- [ ] Build three-panel layout
- [ ] Implement session system (CRUD)
- [ ] Wire task input → orchestrator

### Phase 2: Core Features
- [ ] Add provider routing panel
- [ ] Add tool inspector
- [ ] Add memory viewer

### Phase 3: Advanced
- [ ] Add mode system (human/autonomous)
- [ ] Add debugging console
- [ ] Add safety warnings

### Phase 4: Polish
- [ ] UI polish and accessibility
- [ ] Keyboard shortcuts
- [ ] Theme support

---

## 14. API Contracts

### Core Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/orchestrator` | POST | Send task to agent |
| `/api/memory` | GET/POST | Retrieve/store memories |
| `/api/tools` | GET | List available tools |
| `/api/sessions` | GET/POST/DELETE | Session management |
| `/api/providers` | GET | List providers + status |
| `/api/debug/logs` | GET | Fetch orchestrator logs |

### Example: Send Task

```bash
POST /api/orchestrator
{
  "task": "Write a hello world function",
  "mode": "autonomous",
  "provider": "claude"
}
```

### Example: Get Memory

```bash
GET /api/memory?category=episodic&limit=10
```

---

## 15. Kilo Integration

The Kilo agent from `C:\workspace\medical\free-coding-agent\` integrates with this cockpit:

- **Memory:** Reads context blocks from `CONTEXT_BLOCKS/*.md`
- **Tools:** Uses `/api/list-files`, `/api/read-file`, `/api/write-file`
- **Agents:** Communicates via `/api/kilo`, `/api/claw`, `/api/simple`
- **Server:** Runs on port 4000 (API), 3000 (UI), 4001 (WebSocket)

### Starting Kilo

```cmd
cd C:\workspace\medical\free-coding-agent
npm run cockpit
```

Then access: http://localhost:3000/monaco-cockpit.html

---

## 16. Local vs Cloud Boundaries

| Capability | Local | Cloud |
|------------|-------|-------|
| Agent inference | S:\workspace (Ollama) | Claude/Gemini API |
| Memory storage | SQLite | Optional sync |
| File operations | Direct filesystem | Via tools |
| Tool execution | Local processes | Remote APIs |
| Debugging | Full access | Limited |

**Design Principle:** Local-first with optional cloud augmentation.

---

## 17. Key Design Decisions

1. **Three-panel layout** — Provides clear separation of concerns without overwhelming the user
2. **Session-based continuity** — Prevents context bleed between tasks
3. **Mode toggle** — Gives user explicit control over autonomy level
4. **Tool confirmation in human mode** — Prevents runaway tool chains
5. **Memory approval** — Ensures user controls what gets stored
6. **Provider transparency** — Shows routing decisions for debugging
7. **Safety warnings** — Alerts when system prompt or devtools are modified

---

## 20. Next Steps

To implement this cockpit:

1. **Initialize SvelteKit project** in `workspace/cockpit/`
2. **Build four-pane layout** with fixed left, fluid center, collapsible right, bottom logs
3. **Implement session store** with SQLite backing
4. **Connect to orchestrator API** at `http://localhost:4000`
5. **Add provider routing panel** showing selected provider + reasoning
6. **Build tool inspector** in right panel
7. **Add memory viewer** with search and category filters
8. **Implement mode toggle** with appropriate confirmation dialogs
9. **Add debugging console** with log viewer
10. **Deploy and test** with real agent interactions

---

## 21. Running the Cockpit

Once memory and context blocks are migrated, start the backend:

```cmd
cd S:\workspace
npm run dev
```

Then open the cockpit and you'll see:
- ✅ Agents populated
- ✅ Memory populated
- ✅ Context blocks available
- ✅ Tasks and patterns visible
- ✅ Orchestrator online

---

## 22. Wire Context Blocks into UI

To display Kilo's context blocks in the right pane:

1. Read `CONTEXT_BLOCKS/*.md` files
2. Parse markdown into structured data
3. Display in right pane under "Context" section
4. Show:
   - Bootstrap guide
   - Cockpit status
   - Memory system
   - Tools reference

This replicates how Kilo originally displayed them.

---

## 19. Related Documents

- [FREEAGENT_BOOTSTRAP.md](../FREEAGENT_BOOTSTRAP.md) — Identity and collaboration rules
- [FREEAGENT_PLAN_WORKING.md](../FREEAGENT_PLAN_WORKING.md) — Implementation progress
- [C:\workspace\medical\free-coding-agent\CONTEXT_BLOCKS\](../C:\workspace\medical\free-coding-agent\CONTEXT_BLOCKS\) — Kilo context blocks

---

*This document serves as the complete source of truth for the cockpit redesign. All implementation should reference this document to avoid drift.*
