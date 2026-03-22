# 🔒 IDIOT-PROOF SETUP - ONE TIME ONLY

**Follow this EXACTLY and you will NEVER have to deal with private keys again.**

---

## 🎯 WHERE THE KEY GOES (THE ONLY PLACE)

```
File: C:\workspace\medical\mev-swarm\.env.local
Line: PRIVATE_KEY=PASTE_YOUR_NEW_PRIVATE_KEY_HERE
```

**THAT'S IT. NOWHERE ELSE.**

---

## 📋 ONE-TIME SETUP (DO THIS EXACTLY ONCE)

### Step 1: Create New MetaMask Account
1. Open MetaMask
2. Click "Create Account" → "Add Account"
3. Name it "MAIN_WALLET_REAL_FUNDS_ONLY"
4. **This is Account 1 - the ONLY account that will ever hold real money**

### Step 2: Export Private Key ONE TIME
1. In MetaMask, click your MAIN_WALLET_REAL_FUNDS_ONLY account
2. Click "Account Details"
3. Click "Export Private Key"
4. Enter your password
5. **Copy the 64-character key that starts with 0x**
6. **Never export this key again. EVER.**

### Step 3: Paste into .env.local
1. Open file: `C:\workspace\medical\mev-swarm\.env.local`
2. Find line: `PRIVATE_KEY=PASTE_YOUR_NEW_PRIVATE_KEY_HERE`
3. Replace the text with your actual key
4. Save and close
5. **Never open this file again unless you're moving to a new machine**

### Step 4: Transfer Funds to New Wallet
1. Send your funds to the new wallet address
2. Keep enough ETH for gas (minimum 0.1 ETH)
3. This is your new main wallet

### Step 5: Test Setup
```powershell
cd C:\workspace\medical\mev-swarm
node SAFE_START_WATCHER.js
```

If it starts without errors, you're done. Forever.

---

## 🛡️ SAFETY SYSTEM (AUTOMATIC - YOU DON'T NEED TO THINK)

The bot now has **automatic protection**:

### ✅ Startup Guard
- Bot will NOT start if private key is missing
- Bot will NOT start if key format is wrong
- Bot will NOT start if key is a wallet address (not private key)
- **You cannot accidentally trade with a bad key**

### ✅ Kill Switch
- Create a file named `KILL_SWITCH` in the mev-swarm folder
- Bot will refuse to start until you delete that file
- **Instant emergency stop**

### ✅ Live Trading Lock
- By default, `LIVE_TRADING=false` in .env.local
- Bot will ONLY simulate, never execute real trades
- To trade with real money, you must:
  1. Open .env.local
  2. Change `LIVE_TRADING=false` to `LIVE_TRADING=true`
  3. Restart the bot
- **You cannot accidentally trade**

### ✅ Git Protection
- .env.local is in .gitignore
- Your key will NEVER be committed to git
- **You cannot accidentally share your key**

---

## 🚀 HOW TO START THE BOT (FOREVER)

### Watcher Only (Safe to run)
```powershell
cd C:\workspace\medical\mev-swarm
node SAFE_START_WATCHER.js
```

### Executor with Live Trading (ONLY when ready)
```powershell
# Step 1: Enable live trading
# Open .env.local and change:
# LIVE_TRADING=false  →  LIVE_TRADING=true

# Step 2: Start executor
cd C:\workspace\medical\mev-swarm
node SAFE_START_EXECUTOR.js
```

### Emergency Stop (Instant)
```powershell
cd C:\workspace\medical\mev-swarm
echo > KILL_SWITCH

# Bot will refuse to start now
# To re-enable, delete the KILL_SWITCH file
del KILL_SWITCH
```

---

## ❌ WHAT TO NEVER DO AGAIN

1. **Never export your private key from MetaMask again**
   - Already done it once? Good.
   - That was the last time. Forever.

2. **Never paste your key into terminals**
   - Only ever paste into .env.local
   - That file is protected by .gitignore

3. **Never paste your key into chat logs**
   - The security guard prevents this
   - Even if you try, it only shows redacted version

4. **Never run the old files**
   - Use `SAFE_START_WATCHER.js` instead of `block-watcher.js`
   - Use `SAFE_START_EXECUTOR.js` instead of `arb-executor.js`

5. **Never touch .env file again**
   - The key should be in .env.local only
   - .env is for configuration, not secrets

---

## 🔒 SECURITY CHECKLIST

If you're worried something is wrong, check these:

- [ ] Key is ONLY in .env.local
- [ ] .env.local is in .gitignore (it is)
- [ ] LIVE_TRADING=false in .env.local (default)
- [ ] No KILL_SWITCH file exists
- [ ] Using SAFE_START_*.js files (not old ones)
- [ ] Never exported key from MetaMask again

**All checked? You're secure.**

---

## 📁 FILE STRUCTURE (DO NOT TOUCH)

```
mev-swarm/
├── .env                    ← Configuration (no secrets)
├── .env.local              ← 🗝️ PRIVATE KEY HERE ONLY (gitignored)
├── .gitignore              ← Contains .env.local (safe)
├── security-guard.js        ← 🔒 Protection module (do not modify)
├── SAFE_START_WATCHER.js    ← Safe startup (use this)
├── SAFE_START_EXECUTOR.js    ← Safe startup (use this)
├── block-watcher.js         ← Old file (do not use directly)
├── arb-executor.js          ← Old file (do not use directly)
└── KILL_SWITCH             ← Create to emergency stop
```

**Files to NEVER touch again:**
- .env.local (unless moving to new machine)
- security-guard.js (never modify)
- Any private key export in MetaMask (never do it)

**Files to ALWAYS use:**
- SAFE_START_WATCHER.js
- SAFE_START_EXECUTOR.js

---

## 🆘 WHAT IF SOMETHING GOES WRONG?

### Bot won't start?
1. Check error message - it will tell you exactly what's wrong
2. Most common: Key missing or wrong format
3. Fix .env.local and try again

### Want to test without real money?
1. Keep LIVE_TRADING=false in .env.local
2. Run SAFE_START_WATCHER.js
3. Bot will simulate everything safely

### Want to actually trade with real money?
1. Verify you have enough ETH in your wallet
2. Open .env.local
3. Change LIVE_TRADING=false to LIVE_TRADING=true
4. Run SAFE_START_EXECUTOR.js
5. Bot will show 5-second warning before starting

### Accidentally exposed key somewhere?
1. Create NEW MetaMask account
2. Transfer all funds there
3. Export NEW private key
4. Replace in .env.local
5. Old key is now worthless (that's fine)

### Want to move to a new machine?
1. Copy ONLY .env.local file
2. Paste to same location on new machine
3. Do NOT export from MetaMask again
4. Done

---

## ✅ FINAL CHECKLIST

Before you're done today:

- [ ] Created new MetaMask account named "MAIN_WALLET_REAL_FUNDS_ONLY"
- [ ] Exported private key ONE TIME
- [ ] Pasted key into .env.local
- [ ] Transferred funds to new wallet
- [ ] Verified .env.local is in .gitignore (it is)
- [ ] Tested with `node SAFE_START_WATCHER.js`
- [ ] Saw "✅ Security checks passed" message
- [ ] Never exporting private key again

**All done? You're set forever.**

---

## 🎯 SUMMARY

**Your private key is now:**
- Stored in ONE place only (.env.local)
- Protected by automatic guards
- Never to be touched again
- Impossible to accidentally share

**You will now:**
- Never export private key from MetaMask again
- Never paste key into terminals or chats
- Never worry about key exposure
- Never touch .env.local again (unless moving machines)

**Just run:**
```powershell
node SAFE_START_WATCHER.js
```

And you're done.

---

**Questions?**
- "Where does the key go?" → .env.local, line 2
- "Do I need to export it again?" → NO, never again
- "Can I use the old files?" → NO, use SAFE_START_*.js
- "Will I accidentally trade?" → NO, LIVE_TRADING=false by default

---

**YOU ARE NOW IDIOT-PROOF.** 🎉
