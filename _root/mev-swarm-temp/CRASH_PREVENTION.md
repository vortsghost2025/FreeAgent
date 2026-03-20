# CRASH PREVENTION FIXES

## What Happened
- 12+ Node processes spawned and locked up
- Required force-kill to unlock
- Likely cause: Unbounded polling + massive pending block processing

## Root Causes

### 1. Double Polling in Block Watcher
```javascript
// block-watcher.js line 1063-1064
this.pollMempool();                    // ← Immediate call
this.pollTimer = setInterval(() => this.pollMempool(), this.pollInterval); // ← AND repeated
```
**Fix:** Remove the immediate call - setInterval handles the first call

### 2. Unbounded Pending Block Processing
```javascript
const pendingBlock = await this.provider.send('eth_getBlockByNumber', ['pending', false]);
// pendingBlock.transactions can have 5000+ txs
```
**Fix:** Limit to first N transactions (e.g., 100)

### 3. No Rate Limiting on RPC Calls
Every poll calls:
- `getBlockNumber()`
- `eth_getBlockByNumber(['pending', false])`
- `getCode()` for each router
- `call()` for decoding

With 5000+ pending txs = 15,000+ RPC calls per poll cycle

### 4. Missing Cleanup on Stop
```javascript
stop() {
  this.running = false;
  // Missing: clearInterval(this.pollTimer)
}
```
**Fix:** Clear the interval timer

## Immediate Fixes Required

### Fix 1: Remove Duplicate Polling
```javascript
// BEFORE
this.pollMempool();
this.pollTimer = setInterval(() => this.pollMempool(), this.pollInterval);

// AFTER
this.pollTimer = setInterval(() => this.pollMempool(), this.pollInterval);
```

### Fix 2: Limit Pending Transaction Processing
```javascript
const pendingBlock = await this.provider.send('eth_getBlockByNumber', ['pending', false]);
if (!pendingBlock || !pendingBlock.transactions) return;

// LIMIT TO FIRST 100 TXs
const txHashes = pendingBlock.transactions.slice(0, 100);
```

### Fix 3: Add Rate Limiting
```javascript
// Add at top of BlockWatcher class
this.lastRpcCall = 0;
this.minRpcInterval = 100; // 100ms between RPC calls

// Before each RPC call:
const now = Date.now();
if (now - this.lastRpcCall < this.minRpcInterval) {
  await new Promise(r => setTimeout(r, this.minRpcInterval));
}
this.lastRpcCall = Date.now();
```

### Fix 4: Proper Cleanup
```javascript
stop() {
  this.running = false;
  if (this.pollTimer) {
    clearInterval(this.pollTimer);
    this.pollTimer = null;
  }
  console.log('🛑 Watcher stopped');
}
```

## Safe Startup Sequence

1. First verify no zombie processes:
   ```bash
   tasklist | findstr node
   ```

2. Start watcher ALONE first:
   ```bash
   cd C:\workspace\medical\mev-swarm
   node block-watcher.js
   ```

3. Monitor for:
   - Memory growth (should stay stable)
   - RPC call rate (should be throttled)
   - Process count (should be 1)

4. Only after watcher is stable, start executor in separate terminal:
   ```bash
   node arb-executor.js
   ```

## Post-Crash Recovery Checklist

- [ ] Generate new private key for wallet
- [ ] Move funds to new wallet address
- [ ] Update .env with new PRIVATE_KEY
- [ ] Apply all crash prevention fixes
- [ ] Test with limited transaction count (100)
- [ ] Monitor memory usage for 5+ minutes
- [ ] Gradually increase limits if stable

## Security Note

⚠️ **PRIVATE KEY EXPOSED** - Immediately:
1. Move all funds from 0x29F7... to new wallet
2. Generate new private key
3. Update .env file
4. Never share private keys in chat/logs again
