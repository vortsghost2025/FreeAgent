# MEV-Swarm Stress Test Results

## Overview
This document records results of high-load stress tests on MEV-Swarm watcher after major refactors or configuration changes. The goal is to evaluate system stability, RPC efficiency, caching behavior, and opportunity throughput under elevated pending-transaction caps.

---

## Test Configuration

| Setting | Value |
|---------|--------|
| **Date** | `YYYY-MM-DD HH:MM` |
| **Branch** | `fresh-start` |
| **Watcher Version** | `Refactored (utils/rpc.js, utils/cache.js, utils/tokens.js)` |
| **Executor Version** | `Event-driven, simulation mode` |
| **RPC Provider** | `https://ethereum-mainnet.core.chainstack.com/...` |
| **MAX_PENDING_TXS** | `150` (increased from 100) |
| **Simulation Mode** | `true` (DRY_RUN=true) |
| **Other Notes** | |

---

## Expected Baseline (Refactored Architecture)

### 🎯 Healthy Metrics (What "Good" Looks Like)

| Metric | Healthy Range | Unhealthy Range |
|--------|---------------|-----------------|
| **Pending block processing time** | < 1.5 seconds | > 2.5 seconds |
| **RPC calls per minute** | 80-120 | > 200 |
| **Rate-limit warnings** | 0-1 per minute | > 3 per minute |
| **Cache hit rate (tokens)** | > 85% | < 60% |
| **Cache hit rate (pools)** | > 80% | < 50% |
| **Opportunities per minute** | 2-5 (steady) | 0-1 or bursts |
| **CPU usage** | < 50% single core | > 80% sustained |

### 📊 RPC Behavior
- **Expected**: `📡 RPC calls: 100 (rate-limited)` appears every 60-90 seconds
- **Refactor improvement**: 60-80% fewer RPC calls vs pre-refactor

### 🗄️ Cache Efficiency
- **Expected**: Common tokens (WETH, USDC, DAI) resolve instantly from cache
- **Refactor improvement**: Token/pool metadata fetched once, reused across cycles

### 🔍 Token Resolution
- **Expected**: `resolveToken()` fires only for NEW tokens
- **Refactor improvement**: No repeated metadata lookups for common tokens

---

## Metrics Observed

### 🛰️ Pending Block Throughput

| Metric | Value |
|--------|--------|
| **Average pending block size** | `___` txs |
| **Average processed per cycle** | `___` txs (cap: 150) |
| **Processing time per cycle** | `___` seconds |
| **Any skipped cycles or backlog?** | `Yes/No` |
| **Notes** | |

---

### 📡 RPC Behavior

| Metric | Value |
|--------|--------|
| **Total RPC calls per minute** | `___` |
| **Rate-limit warnings** | `___` (frequency: `___` per minute) |
| **Backoff events triggered** | `___` count |
| **Average retry success time** | `___` ms |
| **Notes on RPC smoothness** | |

---

### 🗄️ Cache Efficiency

| Metric | Value |
|--------|--------|
| **Token cache hit rate** | `___%` |
| **Pool cache hit rate** | `___%` |
| **On-chain token metadata fetches** | `___` count |
| **On-chain pool metadata fetches** | `___` count |
| **Notes on caching behavior** | |

---

### 🔍 Token Resolution

| Metric | Value |
|--------|--------|
| **COMMON_TOKENS hits** | `___` count |
| **Dynamic token discoveries** | `___` count |
| **Missing/invalid token metadata** | `___` count |
| **Notes on token consistency** | |

---

### 🚀 Opportunity Flow

| Metric | Value |
|--------|--------|
| **Opportunities emitted per minute** | `___` |
| **Executor receive latency** | `___` ms |
| **Executor simulation success rate** | `___%` |
| **Any bursts or stalls?** | `Yes/No` |
| **Notes on opportunity quality** | |

---

## Stability Assessment

| Metric | Value |
|--------|--------|
| **CPU usage (avg/max)** | `___% / ___%` |
| **Memory usage (avg/max)** | `___ MB / ___ MB` |
| **Event loop delays** | `___ ms avg / ___ ms max` |
| **Any crashes or stalls?** | `Yes/No (details: ___)` |
| **Overall stability rating** | `___ / 10` (1=failing, 10=excellent) |

---

## Summary

### ✅ What Worked Well
- [ ] RPC calls reduced significantly
- [ ] Cache hitting on common tokens
- [ ] Pending block processing smooth
- [ ] Opportunities emitting steadily
- [ ] System stable under load
- [ ] No rate-limit storms
- [ ] Executor receiving events cleanly

**Details:**

---

### ⚠️ What Needs Tuning
- [ ] Too many RPC calls → tighten backoff or lower cap
- [ ] Rate-limiting too frequent → reduce parallel requests
- [ ] Cache misses on common tokens → check utils imports
- [ ] Pending block backlog → lower MAX_PENDING_TXS
- [ ] Opportunity bursts in executor → add throttling

**Details:**

---

### 🎯 Recommended Next Steps
- [ ] Test at MAX_PENDING_TXS = 200 (if 150 is stable)
- [ ] Enable LIVE_TRADING=true for real execution (if stable)
- [ ] Add parallel executor instances for faster simulation
- [ ] Implement opportunity queue for burst handling
- [ ] Add metrics dashboard for real-time monitoring

---

## Attachments

### Log Excerpts

Paste relevant log sections here:

```
[RPC logs - 60 seconds]
[Cache logs - token/pool hits]
[Opportunity logs - emission flow]
[Any error or warning logs]
```

---

### Screenshots / Graphs

Attach any performance graphs or system monitor screenshots here.

---

## Test History

| Date | Config | RPC/min | Cache Hit% | Opportunities/min | Stability |
|-------|---------|----------|---------------|-------------|
| YYYY-MM-DD | v1.0 (cap=100) | 250 | 65% | 1.2 | 5/10 |
| YYYY-MM-DD | v1.1 (cap=150) | `___` | `___%` | `___` | `___/10` |

---

## Notes

- This template should be filled out during a 5-10 minute stress test
- Compare results across versions to track improvement
- Use "Stability Assessment" to determine if ready for production
- Document any RPC provider switches or network conditions
