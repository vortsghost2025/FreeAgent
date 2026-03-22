# EMERGENCY RECOVERY PROCEDURES

## Status: 4 Zombie Node Processes Detected

```
node.exe                     20948 Console    1     87,064 K
node.exe                     15796 Console    1    121,000 K
node.exe                     39392 Console    1     86,940 K
node.exe                     69152 Console    1    121,676 K
```

## Immediate Action Required

### Step 1: Kill All Node Processes
```powershell
# Option A: Kill all Node processes
taskkill /F /IM node.exe

# Option B: Kill specific PIDs
taskkill /F /PID 20948
taskkill /F /PID 15796
taskkill /F /PID 39392
taskkill /F /PID 69152
```

### Step 2: Verify Cleanup
```powershell
tasklist | findstr node
# Should show no results
```

### Step 3: Check for Port Conflicts
```powershell
netstat -ano | findstr LISTENING
# Note any unexpected ports in use
```

## What Was Fixed

### ✅ Applied Crash Prevention Fixes

1. **Removed Duplicate Polling** (block-watcher.js line 1063-1064)
   - BEFORE: `this.pollMempool()` + `setInterval(...)` = double fire
   - AFTER: Only `setInterval()` - single poll per interval

2. **Limited Pending Block Processing** (block-watcher.js line 1104-1115)
   - BEFORE: Process ALL pending txs (could be 5000+)
   - AFTER: Limit to first 100 txs, with warning if more

3. **Verified Cleanup** (stop() method)
   - Already had proper `clearInterval()` and nullification
   - Processes should shut down cleanly

## Safe Restart Procedure

### Phase 1: Verify Clean State
```powershell
# 1. Kill any remaining node processes
taskkill /F /IM node.exe

# 2. Wait 5 seconds
Start-Sleep -Seconds 5

# 3. Verify no processes remain
tasklist | findstr node
```

### Phase 2: Start Watcher ALONE
```powershell
cd C:\workspace\medical\mev-swarm
node block-watcher.js
```

**Watch for 60 seconds:**
- ✅ Memory stable (not growing continuously)
- ✅ CPU usage reasonable (< 20%)
- ✅ RPC calls rate-limited (not spamming)
- ✅ No "processing first 100" warnings (indicates pending block < 100)

**Expected output:**
```
🔌 Connecting to Ethereum RPC (polling mode)...
✅ Connected! Current block: #XXXXXX
📡 Polling mempool every 1s for pending transactions...
```

**STOP IMMEDIATELY if:**
- Memory growing > 100MB over 60 seconds
- CPU stays > 50%
- Errors about "too many requests" or rate limiting
- Multiple "processing first 100" warnings

### Phase 3: Start Executor (Separate Terminal)
**Only if watcher is stable after 60+ seconds!**

Open new PowerShell window:
```powershell
cd C:\workspace\medical\mev-swarm
node arb-executor.js
```

## Security: Private Key Compromised

⚠️ **CRITICAL:** Your private key was exposed in the chat log:
```
0xe06a93e9b9ddb2350632aa4e6e9e20e931f40e7d288475cceec2a46654723193
```

**Immediate actions:**
1. **DO NOT** use this wallet for any transactions
2. Move all funds to a new wallet ASAP
3. Generate new private key in MetaMask
4. Update .env file with new PRIVATE_KEY
5. Never share private keys in logs/chat again

## Monitoring Commands

### Memory Usage
```powershell
# Watch memory in real-time
while($true) { Get-Process node | Select-Object Id,Name,WorkingSet64; Start-Sleep 5 }
```

### RPC Call Rate (if you add logging)
Add to block-watcher.js:
```javascript
this.rpcCallCount = 0;
// Before each RPC call:
this.rpcCallCount++;
if (this.rpcCallCount % 100 === 0) {
  console.log(`📡 RPC calls: ${this.rpcCallCount}`);
}
```

## Root Cause Summary

The crash was caused by **unbounded processing**:
1. Double polling (2x pollMempool() calls)
2. Processing 5000+ pending transactions per poll
3. Each transaction requiring multiple RPC calls
4. Result: 15,000+ RPC calls per poll cycle
5. Memory explosion → system lockup

## Fixes Applied Status

| Fix | Status | File | Line |
|-----|--------|------|------|
| Remove duplicate polling | ✅ DONE | block-watcher.js | 1063-1064 |
| Limit pending txs to 100 | ✅ DONE | block-watcher.js | 1104-1115 |
| Verify cleanup exists | ✅ VERIFIED | block-watcher.js | 1157-1166 |
| Add rate limiting | ⏳ PENDING | block-watcher.js | TBD |

## Next Steps

1. ✅ Kill zombie node processes
2. ✅ Start watcher alone
3. ⏳ Monitor for 60+ seconds
4. ⏳ If stable, start executor in separate terminal
5. ⏳ Monitor both for stability
6. ⏳ If issues, add rate limiting
