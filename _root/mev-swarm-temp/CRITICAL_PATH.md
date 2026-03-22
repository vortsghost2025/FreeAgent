# MEV Swarm - Critical Path Checklist

> Last updated: 2026-03-03
> Only these files affect runtime behavior. Everything else is noise.

---

## 🧩 Runtime-Critical Files (8 files)

These are the **only files** that affect whether the bot executes trades correctly, safely, and profitably.

### 1. `launcher.js` ⭐ THE BRAIN
- Volatility logic & dynamic thresholds
- Opportunity evaluation
- Execution gating
- Profit threshold: $0.00 (no losses overnight)

### 2. `core/SwarmExecutor.js` ⭐ THE HANDS
- Actual trade execution
- Contract calls
- Transaction submission

### 3. `pool-watcher.js` ⭐ THE EYES
- Spread detection
- Price fetching
- Opportunity generation

### 4. `wallet-config.js` ⭐ THE KEYS
- RPC provider
- Wallet configuration
- dryRun mode control

### 5. Contract Scripts
- `withdraw-funds.js` - Fund withdrawal
- `withdraw-eth.js` - ETH withdrawal
- `verify-contract.js` - Contract verification

### 6. Contract ABIs (must match deployed contract)
- `contracts/Executor.json`
- `contracts/IERC20.json`

---

## 🗑️ Artifact Files (safe to ignore)

Everything below is noise - not loaded, not executed, not affecting runtime:

- ❌ Old launchers (simple-launcher.js, working-launcher.js, direct-launch.js)
- ❌ Old simulators
- ❌ Test harnesses
- ❌ Deployment guides (*.md)
- ❌ Old ABIs
- ❌ Logs
- ❌ Scratch files
- ❌ Experimental modules
- ❌ Partial refactors
- ❌ Unused utilities
- ❌ /docs/*
- ❌ /tests/*
- ❌ /archive/*

---

## ✅ Runtime Dependency Chain

```
launcher.js
   → pool-watcher.js (find opportunities)
       → gas model
       → fee model
   → core/SwarmExecutor.js
       → contracts/Executor.json
       → RPC provider
       → wallet-config.js
```

---

## 🛠️ Quick Validation

Run these to verify runtime files are clean:

```bash
node --check launcher.js
node --check core/SwarmExecutor.js
node --check pool-watcher.js
node --check wallet-config.js
node --check withdraw-funds.js
node --check withdraw-eth.js
node --check verify-contract.js
```

---

## 📊 Current Status

| Component | Status | Threshold |
|-----------|--------|-----------|
| Launcher | ✅ Clean | $0.00 (safe) |
| Executor | ✅ Clean | - |
| Pool Watcher | ✅ Clean | - |
| Config | ✅ Clean | - |
| Contract | ✅ Clean | - |

**Bot is protected against overnight bleed.** ✅

**Auto-balancer integrated** - prevents insufficient funds loops. ✅
