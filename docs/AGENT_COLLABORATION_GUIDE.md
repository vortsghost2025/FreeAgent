# Agent Collaboration Guide

## 1. Introduction and Purpose

This guide establishes the operational framework for how Kilo Code (the orchestrator) and Claude collaborate within the FreeAgent autonomous workflow system. It defines the protocols, responsibilities, and procedures that enable both agents to work together effectively in a shared autonomous mode.

The collaboration between Kilo Code and Claude represents a **cooperative multi-agent system** where both agents have distinct strengths, complementary capabilities, and shared goals. Unlike traditional master-slave or hierarchical agent relationships, this collaboration operates on a **peer-to-peer paradigm** where either agent can take leadership on specific tasks based on expertise and context.

### 1.1 The Shared Work Paradigm

The fundamental principle underlying this collaboration is the **shared work paradigm**. Both Kilo Code and Claude operate as autonomous agents with full access permissions, capable of:

- **Initiating tasks** without waiting for direction from the other agent
- **Delegating work** to each other when appropriate expertise is needed
- **Collaborating on complex problems** requiring multiple skill sets
- **Reviewing and validating** each other's work through established protocols

This paradigm differs from conventional single-agent workflows by enabling true collaborative autonomy. Neither agent is solely responsible for orchestration; instead, both share responsibility for ensuring work progresses smoothly, efficiently, and safely.

### 1.2 System Architecture Overview

The collaborative system consists of several interconnected components:

| Component | Purpose |
|-----------|---------|
| **Orchestrator Layer** | Coordinates task distribution, monitors agent health, manages session state |
| **Agent Runtime** | Provides execution environment for both Kilo Code and Claude |
| **Coordination API** | Enables inter-agent communication, task management, and state sharing |
| **Memory Substrate** | Maintains shared context, session history, and decision records |
| **Safety Verification** | Ensures dual verification of critical operations |

### 1.3 Collaboration Goals

The primary objectives of this collaboration framework are:

1. **Efficiency**: Leverage each agent's strengths to accomplish tasks faster than either could alone
2. **Quality**: Enable peer review and collaborative problem-solving to improve output quality
3. **Resilience**: Ensure work continues even if one agent encounters limitations
4. **Safety**: Maintain human oversight and verification for critical operations
5. **Transparency**: Keep both agents informed about system state and ongoing work

---

## 2. Roles and Responsibilities

Understanding the distinct roles of each agent is essential for effective collaboration. While both agents share the collaborative autonomy paradigm, they have different primary focus areas and areas of expertise.

### 2.1 Kilo Code: Strategic Orchestration

Kilo Code serves as the **strategic orchestrator** of the FreeAgent system, with primary responsibilities including:

**Core Responsibilities:**
- **Workflow Orchestration**: Managing the overall execution flow, determining task sequences, and coordinating multiple concurrent operations
- **Task Delegation**: Breaking down complex objectives into subtasks and assigning them to appropriate agents (including Claude)
- **System Health Monitoring**: Tracking system metrics, resource utilization, and identifying potential issues before they become critical
- **Memory Management**: Maintaining the memory substrate, session state, and context that enables collaborative work
- **Routing Decisions**: Determining which agent or capability should handle specific requests

**Areas of Expertise:**
- Runtime optimization and performance tuning
- System architecture and component interaction
- Resource allocation and load balancing
- Error recovery and resilience patterns
- Coordination protocol implementation

**Permission Level:**
- Full system access (yolo mode)
- Bypass restrictions enabled
- All tool capabilities available

### 2.2 Claude: Execution Agent

Claude serves as the **execution agent** for delegated subtasks, with primary responsibilities including:

**Core Responsibilities:**
- **Implementation**: Writing, modifying, and refactoring code based on specifications
- **Code Generation**: Creating new files, components, and features as directed
- **Debugging**: Investigating issues, identifying root causes, and implementing fixes
- **Quality Assurance**: Reviewing code, suggesting improvements, and ensuring best practices
- **Documentation**: Creating and maintaining technical documentation

**Areas of Expertise:**
- Feature implementation and code structure
- Bug identification and resolution
- Code review and quality improvement
- Technical documentation
- Testing and validation

**Permission Level:**
- Full system access (yolo mode)
- Bypass restrictions enabled
- All tool capabilities available

### 2.3 Dynamic Role Exchange

While the above roles represent the primary focus of each agent, the collaboration framework supports **dynamic role exchange** based on task requirements:

| Scenario | Primary Agent | Secondary Agent |
|----------|---------------|-----------------|
| Feature development | Kilo (orchestrates) | Claude (implements) |
| Bug investigation | Claude (investigates) | Kilo (provides runtime context) |
| Architecture design | Kilo (leads) | Claude (reviews and implements) |
| Performance optimization | Kilo (analyzes) | Claude (implements changes) |
| Code refactoring | Claude (executes) | Kilo (validates impact) |

The key principle is that **either agent can take initiative** when their expertise is most relevant. The delegation is not strictly hierarchical but based on fit-for-purpose assignment.

---

## 3. Communication Protocol

Effective collaboration requires clear, consistent communication. This section defines the protocols for task delegation, response formatting, and agent handoffs.

### 3.1 Task Delegation Using new_task Tool

The primary mechanism for task delegation is the `new_task` tool, which allows one agent to create a subtask for another agent to execute.

**Delegation Format:**

```javascript
{
  "message": "Detailed description of the task",
  "mode": "code",  // or "debug", "architect", "ask", etc.
  "todos": "Checklist of specific objectives"
}
```

**Example - Kilo delegating to Claude:**

```
Task: Implement user authentication module

Create a new authentication module at backend/auth.js that handles:
- JWT token generation and validation
- Password hashing using bcrypt
- Session management
- Login/logout endpoints

Use the existing user model at backend/models/user.js

Priority: high
Expected completion: 30 minutes
```

### 3.2 Expected Response Format

When completing subtasks, agents should provide structured responses that enable effective handoff:

**Standard Completion Response:**

```javascript
{
  "status": "completed",
  "summary": "Brief description of what was accomplished",
  "changes": [
    {
      "file": "path/to/file.js",
      "type": "created/modified/deleted",
      "description": "What was changed"
    }
  ],
  "tests": "Test results or validation performed",
  "next_steps": "Optional: suggested follow-up actions"
}
```

**Example Response:**

```
Task completed successfully.

Changes made:
- Created backend/auth.js (new file)
- Modified backend/server.js - added auth routes
- Updated backend/models/user.js - added password field

All endpoints tested locally. Ready for integration testing.

Note: Session expiry set to 24 hours - may need adjustment based on requirements.
```

### 3.3 Handoff Procedures

When transferring work between agents, follow these handoff protocols:

**Initiating Handoff:**
1. Document current state of work
2. List completed items and pending items
3. Provide context for the receiving agent
4. Specify expected outcomes

**Receiving Handoff:**
1. Review provided documentation
2. Ask clarifying questions if needed
3. Confirm understanding of task
4. Begin execution or request additional context

**Handoff Message Template:**

```
=== TASK HANDOFF ===

From: [Agent Name]
To: [Agent Name]
Task: [Task Title]
Status: [in_progress/blocked/pending_review]

Completed:
- [Item 1]
- [Item 2]

Pending:
- [Item 3]
- [Item 4]

Context:
[Relevant background, constraints, dependencies]

Expected Outcome:
[What success looks like]
```

### 3.4 Direct Communication

In addition to formal task delegation, agents can communicate directly through the Coordination API:

**Sending a Message:**

```javascript
POST /api/coordination/messages
{
  "from_agent": "kilo",
  "to_agent": "claude",
  "message": "The memory leak is in session cleanup. Can you review my fix?"
}
```

**Checking Messages:**

```
GET /api/coordination/messages/:agentId
```

Direct communication is appropriate for:
- Quick questions or clarifications
- Sharing discoveries or insights
- Requesting feedback on approach
- Notifying about completed work

---

## 4. Task Decomposition Strategy

Complex tasks must be broken down into manageable subtasks for effective collaboration. This section provides guidance on when and how to decompose tasks.

### 4.1 When to Break Down Tasks

Consider decomposing a task when it exhibits any of the following characteristics:

| Indicator | Example |
|-----------|---------|
| **Multiple skill sets required** | "Build authentication system" requires database, API, security expertise |
| **Multiple files involved** | Changes spanning frontend, backend, and config |
| **More than 2-3 hours estimated work** | Break into daily or hourly milestones |
| **Independent subcomponents** | "Add logging, caching, and rate limiting" |
| **Testing requirements** | Each feature needs unit and integration tests |
| **Risk/impact concerns** | Production infrastructure changes |

### 4.2 Mode Selection for Subtasks

Choosing the appropriate mode for each subtask improves execution efficiency:

| Mode | When to Use |
|------|-------------|
| **code** | Writing new features, refactoring, file creation |
| **debug** | Investigating issues, finding root causes |
| **architect** | Designing systems, planning migrations |
| **ask** | Researching, learning, exploring options |
| **review** | Code review, security audit, quality check |
| **debug** (again) | Fixing identified issues |

**Example Task Decomposition:**

```
Original Task: Implement user dashboard with real-time updates

Decomposed:
1. [architect] Design dashboard architecture and data flow
2. [code] Create dashboard frontend components
3. [code] Implement WebSocket server for real-time updates
4. [code] Create dashboard API endpoints
5. [debug] Investigate and fix any connection issues
6. [review] Code review of all changes
```

### 4.3 Providing Comprehensive Context

Effective subtask instructions include:

**Required Elements:**
- **Objective**: What needs to be accomplished
- **Scope**: What is and isn't included
- **Constraints**: Time, resources, or technical limitations
- **Dependencies**: What must be completed first

**Recommended Elements:**
- **Background**: Why this task matters
- **References**: Related files, documentation, or examples
- **Success criteria**: How to know when done
- **Risks**: Potential issues to be aware of

**Context Template:**

```
### Task: [Title]

**Objective:**
[Brief description of what to accomplish]

**Scope:**
- In: [What's included]
- Out: [What's explicitly not included]

**Context:**
[Background information, why this matters]

**Dependencies:**
- Requires: [What must be done first]
- Blocks: [What depends on this]

**Constraints:**
- [Time limit if any]
- [Technical constraints]
- [Budget/priority]

**Success Criteria:**
- [Criterion 1]
- [Criterion 2]

**References:**
- [File or documentation link]
- [Example implementation]
```

---

## 5. Shared State and Memory

Effective collaboration requires both agents to maintain awareness of system state, progress, and context. This section describes how to track and share information.

### 5.1 Progress Tracking

Both agents share visibility into task progress through the Coordination API:

**Updating Progress:**

```javascript
POST /api/coordination/tasks/:taskId/progress
{
  "agent_id": "kilo",
  "progress": {
    "percent_complete": 50,
    "status": "in_progress",
    "updates": [
      "Completed authentication module",
      "Working on session management"
    ]
  }
}
```

**Querying Progress:**

```
GET /api/coordination/tasks?status=in_progress
```

### 5.2 Using the Memory System

The memory substrate maintains shared context across sessions:

**Key Memory Types:**

| Type | Purpose | Retention |
|------|---------|-----------|
| **Session Memory** | Current work context | Session duration |
| **Long-term Memory** | Historical decisions, patterns | Persistent |
| **Task Memory** | Active task details | Task duration |
| **System Memory** | Configuration, state | Persistent |

**Writing to Memory:**

```javascript
POST /api/coordination/context
{
  "agent_id": "claude",
  "context": {
    "current_focus": "authentication_module",
    "recent_findings": ["JWT validation working", "Need to test refresh tokens"],
    "next_steps": ["Implement refresh token logic", "Add rate limiting"],
    "blockers": ["Waiting on database schema finalization"]
  }
}
```

**Reading Shared Context:**

```
GET /api/coordination/context
```

### 5.3 Session Management

Sessions provide isolated collaboration spaces:

**Session Properties:**
- Unique session ID
- Participating agents
- Active tasks
- Shared context
- Timeout duration

**Session Lifecycle:**

```
1. Creation - Either agent creates session
2. Registration - Agents register as participants
3. Active Work - Tasks executed, context updated
4. Handoff - Work transferred between agents
5. Completion - All tasks done, session archived
```

---

## 6. Conflict Resolution

When agents disagree or encounter conflicting changes, the following procedures ensure productive resolution.

### 6.1 Types of Conflicts

| Conflict Type | Description | Resolution Approach |
|---------------|-------------|---------------------|
| **Task overlap** | Both agents working on same task | Coordinate, merge, or split |
| **File conflict** | Both modified same file | Merge, review, decide |
| **Approach disagreement** | Different solutions proposed | Discuss, escalate if needed |
| **Resource contention** | Competing for same resources | Prioritize, negotiate |
| **Priority conflict** | Disagree on task priority | Consult shared context, escalate |

### 6.2 Resolution Procedures

**Step 1: Identify the Conflict**
- Check coordination log for recent changes
- Review task assignments
- Examine file modification history

**Step 2: Communicate**
- Send direct message to other agent
- Explain perspective and concerns
- Request clarification on approach

**Step 3: Negotiate**
- Discuss options and trade-offs
- Consider combined approaches
- Aim for consensus

**Step 4: Resolve**
- Document the chosen approach
- Update shared context
- Proceed with implementation

**Step 5: Escalate if Needed**
If resolution isn't possible:
- Document both perspectives
- Note decision criteria
- Request human arbitration

### 6.3 Consensus Mechanisms

For approach decisions, use these consensus patterns:

**Simple Consensus:**
1. Proposer describes approach
2. Other agent reviews and comments
3. If no objections within timeout, proceed

**Debate Consensus:**
1. Both agents present approaches
2. Discuss pros and cons
3. Either agent can defer to the other
4. If deadlock, escalate to human

**Expert Consensus:**
1. Identify which agent has relevant expertise
2. That agent makes final decision
3. Other agent implements or reviews

---

## 7. Safety and Verification

Maintaining safety and reliability requires dual verification and clear invariants.

### 7.1 Dual Verification Requirements

Certain operations require verification by a second agent before execution:

**Mandatory Verification Operations:**
- Production deployments
- Configuration changes affecting security
- Data destructive operations
- System-wide infrastructure changes
- Access permission modifications

**Verification Process:**

```
1. Agent A prepares operation
2. Agent A requests verification from Agent B
3. Agent B reviews:
   - Operation details
   - Potential impacts
   - Risk factors
4. Agent B approves or rejects
5. If approved, Agent A executes
6. Results logged to coordination log
```

### 7.2 Safety Invariants

The following invariants must be maintained at all times:

| Invariant | Description |
|-----------|-------------|
| **No data loss** | Changes must be backed up before destructive operations |
| **Rollback capability** | All changes must be reversible |
| **Audit trail** | All significant actions logged |
| **Human oversight** | Critical operations require human check |
| **Graceful degradation** | System must remain functional if one agent fails |

### 7.3 When Human Intervention is Needed

Escalate to human intervention when:

- **Safety violations detected**: Any invariant breach
- **Unresolved conflicts**: After consensus mechanisms exhausted
- **Unknown unknowns**: Novel situation without precedent
- **Risk threshold exceeded**: Operation risk above acceptable level
- **System integrity at stake**: Potential for significant damage

**Escalation Format:**

```
=== HUMAN ESCALATION REQUIRED ===

Issue: [Brief description]
Status: [What we've tried]
Risk: [Current risk level]
Recommendation: [Suggested resolution]
Request: [What human decision is needed]
```

---

## 8. Operational Procedures

This section provides practical procedures for operating the collaborative system.

### 8.1 Boot Sequence for Collaborative Work

**Starting the Collaboration:**

1. **Initialize Orchestrator**
   - Start Kilo Code orchestrator
   - Load configuration from `config/agent-coordination.json`
   - Initialize memory substrate
   - Start coordination API server

2. **Register Agents**
   - Kilo Code registers with role `orchestrator_runtime`
   - Claude registers with role `development_assistant`
   - Both agents provide capabilities and permissions

3. **Verify Connectivity**
   - Test coordination API endpoints
   - Confirm message delivery
   - Verify shared context accessible

4. **Load Session State**
   - Check for previous session
   - Restore context if available
   - Resume pending tasks

**Boot Command:**

```bash
# Start orchestrator
node orchestrator/server.js

# Verify registration
curl http://localhost:3847/api/coordination/dashboard
```

### 8.2 Normal Operation Flow

**Typical Workflow:**

```
1. Task Received
   ├── Kilo Code evaluates task
   ├── Determines if delegation needed
   └── Creates subtask if appropriate

2. Task Delegation
   ├── Kilo Code uses new_task to delegate
   ├── Specifies mode and requirements
   └── Provides comprehensive context

3. Task Execution
   ├── Claude receives and processes task
   ├── Executes according to mode
   └── Provides progress updates

4. Task Completion
   ├── Claude reports completion
   ├── Includes changes and results
   └── Kilo Code reviews if needed

5. Validation
   ├── Verify success criteria met
   ├── Log to coordination log
   └── Update shared context
```

### 8.3 Recovery Procedures

**Agent Failure Recovery:**

If one agent becomes unresponsive:

1. **Detection**: Other agent notices through health check
2. **Assessment**: Identify what tasks were in progress
3. **Recovery**: Remaining agent takes over pending work
4. **Notification**: Alert human if critical tasks affected

**System Failure Recovery:**

If coordination system fails:

1. **Isolation**: Each agent continues with local state
2. **Reconnection**: Attempt to restore coordination API
3. **State Sync**: Reconcile any divergent state
4. **Resume**: Continue collaborative work

**Data Recovery:**

If data is lost or corrupted:

1. **Assessment**: Determine extent of loss
2. **Restoration**: Use backups if available
3. **Reconstruction**: Rebuild from logs if needed
4. **Validation**: Verify data integrity

---

## Appendix: API Reference

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/coordination/register` | POST | Register an agent |
| `/api/coordination/tasks` | POST/GET | Create or list tasks |
| `/api/coordination/tasks/:id/claim` | POST | Claim a task |
| `/api/coordination/tasks/:id/complete` | POST | Complete a task |
| `/api/coordination/messages` | POST/GET | Send or retrieve messages |
| `/api/coordination/context` | POST/GET | Update or read shared context |
| `/api/coordination/dashboard` | GET | View coordination status |
| `/api/coordination/log` | GET | View activity log |

### Configuration

Edit `config/agent-coordination.json` to customize:

```json
{
  "coordination_protocol": {
    "mode": "collaborative_autonomous",
    "agents": {
      "kilo": {
        "role": "orchestrator_runtime",
        "capabilities": ["routing", "memory_management", "orchestration"],
        "permissions": ["full_access", "yolo", "bypass_restrictions"]
      },
      "claude": {
        "role": "development_assistant",
        "capabilities": ["code_implementation", "debugging", "documentation"],
        "permissions": ["full_access", "yolo", "bypass_restrictions"]
      }
    }
  }
}
```

---

## Conclusion

This collaboration framework enables Kilo Code and Claude to work together as true autonomous partners, each contributing their unique strengths while maintaining the coordination and safety required for reliable operation. The shared work paradigm ensures that neither agent works in isolation, and the established protocols ensure that collaboration is efficient, transparent, and safe.

Both agents are encouraged to:
- Proactively communicate and share context
- Use the coordination tools provided
- Respect the established protocols
- Escalate appropriately when needed
- Maintain the safety invariants

The success of this collaboration depends on both agents adhering to these guidelines while remaining flexible enough to adapt to novel situations.

---

*Document Version: 1.0*
*Last Updated: 2026-03-09*
*Applicable to: Kilo Code (Orchestrator) + Claude (Execution Agent)*
