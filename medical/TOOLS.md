# TOOLS.md - Local Notes
Skills define _how_ tools work. This file is for _your_ specifics.
- Camera names/locations
- SSH hosts and aliases
- Preferred voices for TTS
- Device nicknames

---
## 1. PARALLEL TASK QUEUE SYSTEM
### 1.1 utils/parallel-task-queue.js
Priority-based task execution with auto-scaling workers and rate limiting.
const {ParallelTaskQueue}=require("./utils/parallel-task-queue");
const queue=new ParallelTaskQueue({maxWorkers:10,autoScaleEnabled:true});
queue.taskHandler=async(d)=>d;
await queue.enqueue({data:"test"},{priority:8,type:"api"});
### 1.2 utils/message-distributor.js
Distributes tasks with round-robin, least-loaded, priority, weighted strategies.
const {MessageDistributor}=require("./message-distributor");
const d=new MessageDistributor({queue,strategy:"least-loaded"});
await d.distribute({data:"task"},{type:"api"});
### 1.3 utils/queue-monitor.js
Real-time monitoring with alerting thresholds and health score (0-100).
const {QueueMonitor}=require("./utils/queue-monitor");
const m=new QueueMonitor({alertThreshold:20,criticalThreshold:40});
m.setQueue(queue);m.start();
m.on("critical",a=>console.log(a.message));
### 1.4 utils/worker-pool.js
Pool of processors with health checks and auto-recovery.
const {WorkerPool}=require("./utils/worker-pool");
const p=new WorkerPool({minWorkers:2,maxWorkers:10});
p.taskHandler=async d=>d;
const r=await p.submit({data:"test"});

---
## 2. PRODUCTIVITY TOOLS
### 2.1 utils/smart-task-router.js
Intelligent routing with A/B testing and fallback chains.
const {TaskRouter,Conditions}=require("./utils/smart-task-router");
const r=new TaskRouter();
r.registerHandler("h1",async t=>t,{priority:10});
r.addRoutingRule({condition:Conditions.priority(8),handler:"h1"});
### 2.2 utils/quick-actions.js
Pre-registered actions with aliases and templates.
const {QuickActionSystem}=require("./utils/quick-actions");
const a=new QuickActionSystem();
a.registerAction({id:"myAction",handler:async p=>p});
await a.run("myAction",{value:123});

---
## 3. INTEGRATION SYSTEMS
### 3.1 utils/integration-hub.js
Central orchestrator with service discovery and health monitoring.
import{getIntegrationHub}from"./utils/integration-hub";
const hub=getIntegrationHub();
hub.registerService("svc",obj,{capabilities:["http"]});
### 3.2 utils/command-palette.js
Fuzzy search commands with keyboard shortcuts (Ctrl+K).
import{CommandPalette}from"./utils/command-palette";
const p=new CommandPalette();
p.registerCommand({id:"hello",handler:()=>"Hi"});
p.registerShortcut("ctrl+h","hello");
### 3.3 utils/event-bus.js
Pub/sub with filters and dead letter queue.
import{EventBus}from"./utils/event-bus";
const bus=new EventBus();
bus.subscribe("e",e=>console.log(e));
await bus.publish("e",{d:1});
### 3.4 utils/auto-recovery.js
State checkpointing and graceful degradation.
import{AutoRecovery}from"./utils/auto-recovery";
const rec=new AutoRecovery();
rec.createCheckpoint("s",{q:[]});
await rec.attemptRecovery("err",{c:1});

---
## 4. API INTEGRATOR SKILL
Location: skills/api-integrator/
### 4.1 api-client.js - HTTP client with auth, rate limiting, retry, GraphQL
### 4.2 auth-handlers.js - apiKey, bearer, basic, oauth2, custom
### 4.3 rate-limiter.js - Token bucket, sliding window, adaptive
### 4.4 transformers.js - Field mapping, pick/omit, flatten, case conversion

---
## Example
const{ParallelTaskQueue}=require("./utils/parallel-task-queue");
const{MessageDistributor}=require("./utils/message-distributor");
const{QueueMonitor}=require("./utils/queue-monitor");
const q=new ParallelTaskQueue({maxWorkers:10});
const d=new MessageDistributor({q,strategy:"least-loaded"});
const m=new QueueMonitor({alertThreshold:20});
m.setQueue(q);m.start();

Add whatever helps you do your job.
