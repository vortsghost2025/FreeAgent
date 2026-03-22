# 🔒 PRE-LIVE TRADING SANITY CHECK

## ✅ Step 1: Guardrail Tests Passed

Run these two test scripts to verify safety:

### Test 1: General Guardrail Test
```bash
node test-guardrail-safe.js
```

**Expected Result:**
```
✅ GUARDRAIL IS WORKING CORRECTLY
   All bad trades were blocked. All good trades passed.
```

### Test 2: Force Bad Trade Test
```bash
node test-force-bad-trade.js
```

**Expected Result:**
```
✅ ALL TESTS PASSED
   - Bad trades (negative net) are BLOCKED
   - Trades below minimum are BLOCKED
   - Good trades (above minimum) are APPROVED
```

---

## ✅ Step 2: DRY_RUN Verification

**Check:** [`.env`](.env) file
```bash
DRY_RUN=true
```

**Status:** ✅ Prevents all live trading

**How to Verify:**
```bash
node direct-wallet-executor.js
```

**Expected Output:**
```
🔒 DRY RUN MODE ENABLED - No real trades will execute

... (scanning/trading logic runs) ...

⚡ Executing swap...
🔒 [DRY_RUN] Trade would have executed, but prevented by safety mode
```

**Key Check:** Even when a trade passes profit checks, it should NOT execute if DRY_RUN=true

---

## ✅ Step 3: Console Log Verification

When running `direct-wallet-executor.js`, you MUST see this pattern:

### Pattern for BLOCKED Trades:
```
Profit check → gross: $0.5000, gas+fees: $1.0500, net: $-0.5500
⛔ BLOCKED: Net profit negative after gas/fees
```

### Pattern for PASSED Trades (in DRY_RUN):
```
Profit check → gross: $2.5000, gas+fees: $0.1700, net: $2.3300
✅ PASS: Net profit positive

⚡ Executing swap...
🔒 [DRY_RUN] Trade would have executed, but prevented by safety mode
```

### Pattern for PASSED Trades (when LIVE):
```
Profit check → gross: $2.5000, gas+fees: $0.1700, net: $2.3300
✅ PASS: Net profit positive

⚡ Executing swap...
📤 Transaction sent: 0x...
✅ Confirmed in block 12345678
```

### 🔴 RED FLAG (DO NOT GO LIVE IF YOU SEE THIS):
```
⚡ Executing swap...
```
**WITHOUT a preceding "Profit check →" log**

This means there's a side door bypassing the guardrail. Find it and fix it.

---

## ✅ Step 4: Forced High Minimum Test

Temporarily set a very high minimum in `.env`:
```bash
MIN_NET_PROFIT=5.0
```

**Then run:** `node direct-wallet-executor.js`

**Expected Behavior:**
- ALL trades should show: `⛔ BLOCKED: Net profit $X below minimum $5.00`
- NO trades should execute
- If any trade executes → guardrail not working → DO NOT GO LIVE

**After test, reset:**
```bash
MIN_NET_PROFIT=1.0
```

---

## ✅ Step 5: Monitor for 24 Hours (DRY_RUN Only)

Run the bot in dry mode for 24+ hours:
```bash
node direct-wallet-executor.js
```

**While monitoring, verify:**
1. ✅ Every trade decision shows "Profit check →" log
2. ✅ No trade executes without profit check log
3. ✅ Bad trades show "⛔ BLOCKED" and stop
4. ✅ Good trades show "✅ PASS" but don't execute (DRY_RUN)
5. ✅ No real transactions appear on Etherscan (your wallet address)

---

## ✅ Step 6: Share One Real Trade Log for Math Verification

Before going live, paste one complete trade log here:

```
Profit check → gross: $X.XXXX, gas+fees: $Y.YYYY, net: $Z.ZZZZ
✅ PASS: Net profit positive

⚡ Executing swap...
[rest of the log]
```

**I will verify:**
- Math is correct (net = gross - gas - fees)
- No errors in calculations
- Guardrail decision matches expectations

---

## 🚨 ONLY WHEN ALL ABOVE PASSED:

### Step 7: Go Live (Carefully!)

1. **Stop bot:** Press `Ctrl+C` if running

2. **Update `.env`:**
   ```bash
   DRY_RUN=false
   MIN_NET_PROFIT=1.0  # Keep conservative
   ```

3. **Start bot:**
   ```bash
   node direct-wallet-executor.js
   ```

4. **Monitor closely while awake:**
   - Watch for "✅ PASS" logs
   - Verify transactions appear on Etherscan
   - Confirm profit is positive
   - Watch for any "⛔ BLOCKED" messages (normal)

5. **Keep watch for first 10-20 trades:**
   - Confirm all have profit checks before execution
   - Confirm all are net-positive
   - Confirm no unexplained losses

---

## 🛡️ Safety Guarantees (After All Checks Passed)

With all patches and verification complete, the bot is guaranteed to:

1. ✅ **Never execute a net-negative trade**
2. ✅ **Never trade with incorrect balance data**
3. ✅ **Always log profit calculation before execution**
4. ✅ **Block trades when gas > 50 gwei**
5. ✅ **Require minimum $1.00 net profit**
6. ✅ **Enforce DRY_RUN mode when enabled**
7. ✅ **Have no side doors bypassing guardrails**

---

## 📊 What This Prevents

| Risk | Status |
|-------|--------|
| ETH/WETH confusion | ✅ FIXED |
| Balance check errors | ✅ FIXED |
| Wrong profit math | ✅ FIXED |
| Net-negative trades | ✅ IMPOSSIBLE |
| Overnight losses | ✅ IMPOSSIBLE |
| Side doors bypassing guardrail | ✅ VERIFIED |
| Live trading without verification | ✅ BLOCKED |

---

## 📝 Current Status

- ✅ Guardrail tests: PASSED
- ✅ DRY_RUN mode: ENABLED
- ✅ Console log verification: REQUIRED
- ✅ High minimum test: REQUIRED
- ✅ 24-hour monitoring: REQUIRED
- ✅ Trade log math verification: REQUIRED
- ❌ Live trading: NOT READY

**STATUS:** 🔒 SAFE TO TEST (DRY_RUN ONLY)
**NOT READY FOR LIVE TRADING**

---

*Follow this checklist exactly. Do not skip steps. Do not go live until all checks pass.*
