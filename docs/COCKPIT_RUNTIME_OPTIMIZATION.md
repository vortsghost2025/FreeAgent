# Cockpit Runtime Optimization Guide

## Based on Your Memory Optimization Plan

> *"Don't let all three compete simultaneously."* — The core principle

---

## Your Architecture Summary

| Component | RAM | When Active |
|-----------|-----|-------------|
| VS Code (Editing) | ~2GB | Phase 1 |
| LM Studio (Inference) | 6-8GB | Phase 2 |
| Browser/Cockpit | ~4GB | Phase 3 |
| **Total** | **12-14GB** | Sequential |

---

## Implementation: Quick Wins

### 1. RAM Guardrail Script

```powershell
# memory-guard.ps1 - Save to workspace/
$ramThreshold = 2GB
$cooldown = 30

while ($true) {
    $freeRam = (Get-WmiObject Win32_OperatingSystem).FreePhysicalMemory * 1KB
    
    if ($freeRam -lt $ramThreshold) {
        Write-Host "⚠️ RAM LOW: $([math]::Round($freeRam/1GB, 2))GB - Pausing LM Studio"
        Stop-Process -Name "LMStudio" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds $cooldown
    }
    
    Start-Sleep -Seconds 5
}
```

### 2. Memory Monitor

```javascript
// memory-monitor.js
const os = require('os');

setInterval(() => {
  const total = os.totalmem() / 1e9;
  const free = os.freemem() / 1e9;
  const used = total - free;
  const percent = (used / total) * 100;
  
  const status = percent > 90 ? '🔴' : percent > 75 ? '🟡' : '🟢';
  
  console.log(`${status} RAM: ${used.toFixed(1)}GB / ${total.toFixed(1)}GB (${percent.toFixed(0)}%)`);
  
  if (free < 2) {
    console.log('⚠️ CRITICAL: Switch to cloud mode!');
  }
}, ### 3. Phase Controller

```javascript
// phase5000);
```

-controller.js
const PHASES = {
  EDITING: 'editing',
  INFERENCE: 'inference', 
  ORCHESTRATION: 'orchestration'
};

class PhaseController {
  constructor() {
    this.currentPhase = PHASES.EDITING;
    this.ramThreshold = 4 * 1024 * 1024 * 1024; // 4GB
  }
  
  async checkAndSwitch() {
    const freeRam = os.freemem();
    
    if (freeRam < this.ramThreshold && this.currentPhase !== PHASES.INFERENCE) {
      await this.switchToCloud();
    }
  }
  
  async switchToCloud() {
    console.log('⚠️ Low RAM - routing to Groq cloud');
  }
}
```

---

## VS Code Settings

```json
{
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/node_modules/**": true
  },
  "typescript.suggest.autoImports": false,
  "editor.minimap.enabled": false,
  "search.followSymlinks": false,
  "telemetry.telemetryLevel": "off"
}
```

---

## Key Insight: Temporal Locality

```
Time →

[Editing] ──► [Inference] ──► [Orchestration] ──► [Editing]
   2GB          6-8GB           4GB              2GB
   (VS Code)    (LM Studio)     (Browser)        (VS Code)
   
Don't let all three compete simultaneously.
```

This is **federated scheduling** applied to your workstation.

---

## Running the Monitor

```bash
# Terminal 1: Memory monitor
node memory-monitor.js

# Terminal 2: Your app
npm start
```

---

*Based on your memory-optimization-plan.md — "peak Sean" architecture in action.*
