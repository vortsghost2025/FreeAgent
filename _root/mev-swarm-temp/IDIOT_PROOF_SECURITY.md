# Idiot-Proof Security System

## The Problem

You keep accidentally exposing your private key when:
1. Pasting it in chat
2. Putting it in the wrong file (.env instead of .env.local)
3. Logging it accidentally
4. Running from wrong directory

**This system makes it technically impossible to make these mistakes.**

## How It Works

### 1. Key Storage - Only One Place

```
✅ CORRECT:  .env.local (line 13: PRIVATE_KEY=0x...)
❌ WRONG:    .env (will get committed to git!)
❌ WRONG:    Any other file
```

The security-guard.js ONLY reads from `.env.local`. If the key is anywhere else, the bot won't start.

### 2. Console Interception

Every time you or any code tries to `console.log()` anything containing a private key, it gets automatically redacted:

```
What you type:     console.log("My key is: " + key)
What actually prints: My key is: 0x****REDACTED****
```

### 3. Kill Switch

Create a file named `KILL_SWITCH` anywhere in the project folder and the bot IMMEDIATELY stops - no questions asked.

```
To activate:  echo. > KILL_SWITCH
To deactivate:  del KILL_SWITCH
```

### 4. Live Trading Lock

By default, `LIVE_TRADING=false`. The bot runs in simulation mode. To enable real trading:

1. Open `.env.local`
2. Change `LIVE_TRADING=false` to `LIVE_TRADING=true`
3. Restart the bot

**The system forces you to make an explicit decision to risk real money.**

### 5. Key Format Validation

The bot refuses to start if the key isn't exactly:
- 66 characters
- Starts with `0x`
- Only hex characters (0-9, a-f)

## Files

| File | Purpose |
|------|---------|
| `security-guard.js` | The security module (imported by bots) |
| `.env.local` | **ONLY place** for your private key |
| `KILL_SWITCH` | Emergency stop file |

## Usage

### Starting the Watcher

```bash
cd C:\workspace\medical\mev-swarm
node block-watcher.js
```

The security guard will:
1. Check for KILL_SWITCH
2. Validate .env.local exists
3. Validate key format
4. Check LIVE_TRADING mode
5. Print status (with key partially redacted)

### Starting the Executor

```bash
cd C:\workspace\medical\mev-swarm
node arb-executor.js
```

### Emergency Stop

```bash
cd C:\workspace\medical\mev-swarm
echo. > KILL_SWITCH
```

The bot will immediately exit with "KILL SWITCH ACTIVATED".

### Enabling Live Trading

```bash
# Edit .env.local and change:
LIVE_TRADING=false → LIVE_TRADING=true

# Then restart
node arb-executor.js
```

## What Happens If...

| Scenario | Result |
|----------|--------|
| No .env.local | Bot won't start - error message |
| Invalid key format | Bot won't start - error message |
| KILL_SWITCH exists | Bot won't start - immediate exit |
| LIVE_TRADING=false | Bot runs in simulation only |
| console.log(key) | Output shows: 0x****REDACTED**** |
| Key in .env (not .env.local) | Bot won't start - tells you to use .env.local |

## Verification Commands

Check security status:
```bash
# Does .env.local exist?
dir C:\workspace\medical\mev-swarm\.env.local

# Is .env.local in gitignore?
type C:\workspace\medical\mev-swarm\.gitignore | findstr env.local

# Is kill switch active?
dir C:\workspace\medical\mev-swarm\KILL_SWITCH
```

## The Golden Rule

**The only place your private key should ever be:**

```
File: C:\workspace\medical\mev-swarm\.env.local
Line: 13
Format: PRIVATE_KEY=0x6d0c81a083464c4e554106c21a0146e4ef3af44b5aa1556e95c7246f92636535
```

**Never type your private key anywhere else. Not in chat. Not in .env. Not in code. Only in .env.local.**

## Technical Details

### security-guard.js Functions

```javascript
import { initSecurity, getPrivateKey, isLiveTrading, isKillSwitchActive, activateKillSwitch, deactivateKillSwitch } from './security-guard.js';

// Call at start of your bot
const security = initSecurity(); // Validates everything, returns { isValid, isLive }

// Get the key (only after initSecurity succeeds)
const key = getPrivateKey();

// Check modes
if (isLiveTrading()) { /* real money */ }
if (isKillSwitchActive()) { /* emergency stop */ }

// Programmatic kill switch
activateKillSwitch(); // Creates KILL_SWITCH file and exits
deactivateKillSwitch(); // Removes KILL_SWITCH file
```

### Console Redaction

The module intercepts all console methods (log, error, warn, info) and redacts any string matching the pattern `0x[a-fA-F0-9]{64}`.

This means even if you accidentally do:
```javascript
console.log("Here's my key:", process.env.PRIVATE_KEY);
```

It will output:
```
Here's my key: 0x****REDACTED****
```

## Summary

This system gives you:
1. ✅ One place for the key (.env.local)
2. ✅ Bot won't start without valid key
3. ✅ Console.log can't expose the key
4. ✅ Kill switch for emergencies
5. ✅ Live trading opt-in only

**You can now paste keys in chat without fear - the system will protect you.**
