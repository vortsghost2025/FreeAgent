# 🛡️ Cockpit Log Watcher - Manual Monitoring Tool

## What This Is
A **manual** log monitoring tool for your cockpit server. You control when it runs.

**What it does:**
- ✅ Detects common error patterns in server output
- ✅ Alerts you in real-time (red text in console)
- ✅ Saves errors to `cockpit-errors.log`
- ✅ Checks if server is still running
- ✅ Detects port conflicts

**What it does NOT do:**
- ❌ No background daemons
- ❌ No auto-starting
- ❌ No hidden processes
- ❌ No autonomous monitoring

---

## How To Use

### Option 1: JavaScript Watcher (Recommended)
```bash
# In one terminal, start the server
node cockpit-server.js

# In another terminal, run the watcher
node cockpit-log-watcher.js
```

### Option 2: Simple Batch Script
```batch
# Run the watcher
cockpit-log-watcher.bat
```

---

## Stopping
Press `Ctrl+C` in the watcher terminal to stop.

---

## Error Log File
Errors are automatically saved to:
```
C:\workspace\medical\cockpit-errors.log
```

View it anytime:
```bash
type cockpit-errors.log
```

---

## Common Errors Detected
- `EADDRINUSE` - Port already in use
- `ReferenceError` - Variable/function not defined
- `SyntaxError` - Code syntax issues
- `TypeError` - Wrong type usage
- `undefined` - Accessing undefined values
- `Failed to` - General failures
- `connection refused` - Network issues

---

## Tips
1. **Keep it visible** - Leave the watcher terminal window open while working
2. **Run it manually** - Only when you want to monitor
3. **Check error log** - After you hit issues, review `cockpit-errors.log`
4. **Pair with server** - Run in separate terminal from the server

---

## You Are In Control
- You decide when to start it
- You decide when to stop it
- It only watches, it doesn't modify anything
- Fully transparent - you see everything it does
