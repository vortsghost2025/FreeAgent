# Monaco IDE Advanced Features Plan

## Overview

This plan outlines the next phase of features for the Monaco Cockpit IDE, building on the existing foundation of Monaco Editor, file tree, agent chat, and terminal panels.

## Current State

The Monaco IDE currently has:
- Monaco Editor with syntax highlighting
- File explorer with directory listing
- Multi-tab file editing
- Agent chat panel (Kilo, Claw, Simple)
- Terminal panel for command output

## Planned Features

### Phase 1: Agent-Powered Inline Actions

**Goal:** Enable agents to provide inline code actions directly in the editor

**Components:**
- Add Monaco "Code Actions" provider for agent suggestions
- Create hover tooltips with agent-generated fixes
- Add "Accept/Reject" buttons for agent suggestions
- Implement inline diff preview before applying changes

**API Endpoints Needed:**
- `POST /api/agent/code-action` - Get code action suggestions from agent

### Phase 2: Real-Time Agent Linting

**Goal:** Replace static linters with AI-powered agent analysis

**Components:**
- Add Monaco "Diagnostics" provider
- Create background linting triggered by agent
- Show warnings/errors in Problems panel
- Integrate with agent memory for project-specific rules

**Implementation:**
- Debounced analysis on file save/change
- Agent analyzes code and returns issues
- Issues displayed with severity levels

### Phase 3: Multi-Agent Code Review Panel

**Goal:** Dedicated panel for parallel agent code reviews

**Components:**
- Add "Review" tab to right panel
- Spawn multiple agents (Kilo, Claw, Simple) for parallel review
- Show reviews side-by-side
- Aggregate findings with consensus highlighting
- Add "Request Review" button in toolbar

**Workflow:**
```
User clicks "Request Review" 
  → Read current file
  → Send to Kilo, Claw, Simple in parallel
  → Display results in Review panel
  → User can click issues to jump to line
```

### Phase 4: Memory-Aware Project Analysis

**Goal:** Agents remember project context across sessions

**Components:**
- Connect to existing agent-memory system
- Store analysis results with project context
- Load relevant memory when analyzing files
- Add "Project Insights" sidebar panel

**Memory Integration:**
- Analyze imports/dependencies
- Check against existing patterns in memory
- Flag potential issues based on past bugs

### Phase 5: Workflow Runner Sidebar

**Goal:** Sidebar for running predefined and custom workflows

**Components:**
- Add "Workflows" section to left sidebar
- Define workflow schemas (JSON)
- Create common workflows:
  - Run tests
  - Build project
  - Deploy
  - Code review
  - Refactor selected
- Show workflow status and output

**Workflow Schema:**
```json
{
  "name": "Run Tests",
  "steps": [
    { "command": "npm test", "agent": "test" }
  ]
}
```

### Phase 6: Git Integration

**Goal:** Full Git operations within the IDE

**Components:**
- Add Git panel to left sidebar
- Show file status (modified, new, deleted)
- Stage/unstage files
- Commit with message
- Show diff for changes
- Branch management

**API Endpoints Needed:**
- `GET /api/git/status` - Get git status
- `POST /api/git/commit` - Commit changes
- `GET /api/git/diff` - Get file diff
- `GET /api/git/log` - Get commit history

### Phase 7: Live Preview Panel

**Goal:** Preview HTML/JS changes in real-time

**Components:**
- Add "Preview" tab to bottom panel
- iframe-based preview for HTML
- Auto-refresh on file save
- Console output capture
- Error overlay for runtime errors

**Implementation:**
- Serve static files via Express
- WebSocket for live reload
- Sandboxed iframe for security

### Phase 8: Agent-Generated Diffs

**Goal:** Visual diff UI for agent changes

**Components:**
- Monaco diff editor integration
- Side-by-side original vs. agent-suggested
- Accept/Reject individual changes
- "Apply All" / "Reject All" buttons
- History of applied changes

### Phase 9: Multi-File Refactoring

**Goal:** Refactor across multiple files with agent assistance

**Components:**
- "Refactor" mode in toolbar
- Select files to refactor
- Agent analyzes and plans changes
- Preview all changes in diff view
- Apply atomically with rollback on failure

**API Endpoints Needed:**
- `POST /api/agent/refactor-plan` - Get refactoring plan
- `POST /api/agent/refactor-apply` - Apply refactoring

### Phase 10: Project-Wide Agent Search

**Goal:** AI-powered search across entire project

**Components:**
- Add search panel (Ctrl+Shift+F style)
- Agent analyzes search query
- Returns semantic matches, not just text
- Shows context around matches
- Click to open file at location

**Implementation:**
- Agent reads relevant files
- Performs semantic search
- Returns ranked results with explanations

## Architecture Diagram

```mermaid
graph TB
    subgraph Monaco IDE
        Editor[Monaco Editor]
        FileTree[File Explorer]
        AgentPanel[Agent Chat]
        Terminal[Terminal]
        ReviewPanel[Code Review]
        WorkflowPanel[Workflows]
        PreviewPanel[Live Preview]
    end
    
    subgraph Backend API
        FileAPI[/api/read-file, /api/write-file]
        GitAPI[/api/git/*]
        AgentAPI[/api/kilo, /api/claw, /api/simple]
        LintAPI[/api/agent/lint]
        RefactorAPI[/api/agent/refactor*]
    end
    
    subgraph Agent System
        Kilo[Kilo Agent]
        Claw[Claw Agent]
        Simple[Simple Agent]
        Memory[Agent Memory]
    end
    
    Editor --> AgentAPI
    FileTree --> FileAPI
    AgentPanel --> AgentAPI
    AgentAPI --> Kilo
    AgentAPI --> Claw
    AgentAPI --> Simple
    Kilo --> Memory
    ReviewPanel --> AgentAPI
    WorkflowPanel --> GitAPI
    PreviewPanel --> FileAPI
```

## Priority Order

| Priority | Feature | Reason |
|----------|---------|--------|
| 1 | Agent-Powered Inline Actions | Core value proposition |
| 2 | Real-Time Agent Linting | Immediate productivity boost |
| 3 | Multi-Agent Code Review | Leverages existing agents |
| 4 | Git Integration | Essential for development |
| 5 | Memory-Aware Analysis | Differentiator from VS Code |
| 6 | Agent-Generated Diffs | Visual trust in AI changes |
| 7 | Workflow Runner | Automation hub |
| 8 | Live Preview | Web dev workflow |
| 9 | Multi-File Refactoring | Advanced refactoring |
| 10 | Project-Wide Search | Discovery |

## Implementation Notes

- Use Monaco's built-in providers (CodeActionProvider, DiagnosticCollection, etc.)
- Leverage existing `/api/kilo`, `/api/claw`, `/api/simple` endpoints
- Reuse agent-memory system from existing codebase
- Keep API responses small to avoid token limits (chunk large files)
- Add debouncing for real-time features

## Files to Modify

1. `public/monaco-cockpit.html` - Main UI
2. `cockpit-server.js` - New API endpoints
3. `cockpit-tools.js` - Tool layer enhancements
4. `agent-memory.js` - Memory integration