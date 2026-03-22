# SYSTEM_BOOT_SEQUENCE.md

## Deterministic Startup Order for FreeAgent Cockpit

**Principle:** One command → clean slate → known-good state.

---

## Boot Phases

### Phase 0: Pre-Check

```powershell
# Kill any rogue processes
taskkill /F /IM node.exe 2>$null
taskkill /F /IM LMStudio.exe 2>$null
taskkill /F /IM memurai.exe 2>$null
```

### Phase 1: Infrastructure

1. **Memurai** (Redis) - Event Bus backbone
2. **Port availability** - Verify 3001/3002/3003/3101/4000

### Phase 2: Core Services

3. **Memory substrate** - Load 48-layer persistent memory
4. **Event Bus** - Connect to Redis streams

### Phase 3{: Agent Runtime

5. **Agent workers** - Subscribe to task streams
6. **Orchestrator** - Connect to router