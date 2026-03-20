# FREEAGENT_SYSTEM_MAP

# Overview
FreeAgent is a local‑first adaptive agent runtime built around three pillars:
- System health awareness
- Adaptive behavior
- Long‑run stability

This map defines the architecture, components, data flows, and relationships between the moving parts. It is the authoritative reference for how FreeAgent works.

---

# Core Architecture

## Runtime Loop
The runtime loop is the heart of FreeAgent. It executes continuously and adapts behavior based on system stress.

### Responsibilities
- Poll system metrics
- Compute stress score
- Adjust concurrency and behavior
- Trigger cleanup cycles
- Route tasks to agents
- Maintain stability under load

### Key Behaviors
- Slow down when system is stressed
- Speed up when system is stable
- Prevent runaway resource usage
- Keep agents responsive even under heavy load

---

# Stress Scoring Engine

## Purpose
Convert raw system metrics into a single stability score.

## Inputs
- CPU usage
- RAM usage
- GPU load (if available)
- Disk I/O
- Inference latency
- Process count
- Optional: temperature, swap usage, VRAM

## Output
A normalized score (0–100) representing system stress.

## Usage
The runtime loop uses this score to:
- throttle concurrency
- adjust tool execution rate
- modify agent behavior
- schedule cleanup cycles

---

# Adaptive Behavior Layer

## Purpose
Make agents behave differently depending on system conditions.

## Examples
- Reduce parallel tasks when stressed
- Increase batch size when stable
- Switch to lighter models under load
- Delay non‑critical tasks
- Trigger cleanup cycles earlier

## Design Principles
- Never crash the machine
- Never freeze the agent
- Always degrade gracefully
- Always recover automatically

---

# Rolling Cleanup System

## Purpose
Prevent drift, memory leaks, and zombie processes.

## Responsibilities
- Kill orphaned subprocesses
- Clear stale caches
- Reset temporary directories
- Clean up old logs
- Reclaim memory from abandoned tasks

## Trigger Conditions
- Stress score above threshold
- Runtime loop detects drift
- Scheduled interval
- Manual override

---

# Agent Layer

## Purpose
Provide a simple interface for building agents that automatically inherit adaptive behavior.

## Features
- Task routing
- Tool execution
- Adaptive throttling
- Context management
- Local provider integration (LM Studio, Ollama)
- Optional cloud augmentation

## Agent Types (examples)
- Task agents
- Research agents
- Cleanup agents
- Monitoring agents
- Example/demo agents for the repo

---

# Data Flow

## High-Level Flow
1. Metrics collected  
2. Stress score computed  
3. Runtime loop adjusts behavior  
4. Agents execute tasks  
5. Cleanup system runs as needed  
6. Logs and state updated  

## Flow Characteristics
- Continuous
- Self-correcting
- Adaptive
- Local-first

---

# Repo Structure (Canonical)
