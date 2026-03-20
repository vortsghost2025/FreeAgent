# Cockpit Agent Tool Execution Plan

## Problem
The AI agents in the cockpit (Kilo, Claw, Llama, Grok) cannot actually make changes to VS Code files. They are just LLM calls that return text responses - they can talk about code but can't execute or modify anything.

## Current Architecture
```
Cockpit API → ProviderRouter → Groq/OpenClaw LLM → Text Response
```

## Desired Architecture
```
Cockpit API → Tool Detection → LLM Call → Tool Execution → Result → LLM Synthesis → Response
```

## Implementation Steps

### Step 1: Create Tool Executor Module
Create `cockpit-tools.js` with functions for:
- `readFile(path)` - read file contents
- `writeFile(path, content)` - write/modify files
- `executeCommand(cmd)` - run shell commands
- `listFiles(path)` - list directory contents

### Step 2: Modify /api/kilo Endpoint
- Parse user message for tool requests (e.g., "read file X", "run command Y")
- Execute tools if requested
- Pass tool results back to LLM for synthesis

### Step 3: Modify /api/claw Endpoint
- Same as step 2 for Claw

### Step 4: Add Tool Detection
Detect when user wants to execute tools:
- "read [file]" → readFile tool
- "write [file]" → writeFile tool  
- "run [command]" → executeCommand tool
- "list [directory]" → listFiles tool

### Step 5: System Prompt Updates
Update agent system prompts to explain available tools and how to request them.

## Example: How It Would Work

**User:** "Create a new file called hello.js with console.log('hello')"

**Cockpit detects:** writeFile tool request
**Cockpit executes:** writeFile("hello.js", "console.log('hello')")
**Cockpit passes result to LLM:** "File created successfully"
**Response:** "I've created hello.js for you with the hello world message."

## Security Considerations
- Only allow operations within workspace directory
- Block dangerous commands (rm -rf, format, etc.)
- Add user confirmation for destructive operations