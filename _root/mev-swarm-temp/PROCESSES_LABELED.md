# ✅ PROCESSES NOW LABELED

**Date:** 2026-03-03 19:50
**Status:** Processes will show clear labels in Task Manager

---

## 🏷️ How Processes Now Appear

When you start the watcher and executor, they will show up in:
- **Windows Task Manager**
- **PowerShell** (Get-Process node)
- **Task Manager Details** (with process titles)

### Watcher Process
```
Name: node.exe
Title: WATCHER - Block Watcher (Polling Mempool)
Memory: ~90-100 MB
CPU: ~1-2%
```

### Executor Process
```
Name: node.exe
Title: EXECUTOR - Arbitrage Executor (Simulation Mode)
Memory: ~150-200 MB
CPU: ~5-10%
```

---

## 🚀 How to Start (With Labels)

### Step 1: Remove Kill Switch
```powershell
cd C:\workspace\medical\mev-swarm
del KILL_SWITCH
```

### Step 2: Start Watcher (Terminal 1 - Tab = "WATCHER")
```powershell
cd C:\workspace\medical\mev-swarm
node block-watcher.js
```

**You'll see:**
```
🏷️  Process Label: WATCHER
✅ Security checks passed.

🔌 Connecting to Ethereum RPC (polling mode)...
✅ Connected! Current block: #20941234
📡 Polling mempool every 1s for pending transactions...
```

### Step 3: Start Executor (Terminal 2 - Tab = "EXECUTOR")
```powershell
cd C:\workspace\medical\mev-swarm
node arb-executor.js
```

**You'll see:**
```
🏷️  Process Label: EXECUTOR (SIMULATION)
✅ Security checks passed.

🔒 SIMULATION MODE - No real trades will be executed

[Process exits]
```

---

## 📊 How to Identify Processes

### PowerShell (Get-Process)
```powershell
Get-Process node | Format-Table Id, ProcessName, CPU, PM, WS
```

**Output:**
```
Id      ProcessName    CPU(s)    Working Set(M)    WS(K)
14652   node           1.20       93964              88280
36732   node           1.42       96436              89776
```

### PowerShell (With Titles)
```powershell
Get-Process node | Format-Table Id, ProcessName, MainWindowTitle, CPU, PM
```

**Output:**
```
Id      ProcessName    MainWindowTitle                           CPU(s)    PM(M)
14652   node           WATCHER - Block Watcher (Polling Mempool)   1.20       93964
36732   node           EXECUTOR - Arbitrage Executor (Simulation Mode)  1.42       96436
```

---

## 🎯 Process Identification Guide

| Process | Title in Task Manager | Memory | CPU | What It Does |
|----------|----------------------|--------|-----|---------------|
| WATCHER | WATCHER - Block Watcher | ~90-100 MB | 1-2% | Polls mempool, decodes swaps |
| EXECUTOR | EXECUTOR - Arbitrage Executor | ~150-200 MB | 5-10% | Simulates arbitrage routes |

---

## 🛑 Kill Any Process

If you need to kill a specific process:

**By Title (if labeled):**
```powershell
Get-Process node | Where-Object {$_.MainWindowTitle -like "*WATCHER*"} | Stop-Process -Force
Get-Process node | Where-Object {$_.MainWindowTitle -like "*EXECUTOR*"} | Stop-Process -Force
```

**All Node Processes:**
```powershell
Get-Process node | Stop-Process -Force
```

---

## ✅ Summary

- ✅ Watcher labeled as "WATCHER"
- ✅ Executor labeled as "EXECUTOR (SIMULATION)"
- ✅ Easy to identify in Task Manager
- ✅ Easy to identify in PowerShell
- ✅ No more confusion about which process is which

**You can now clearly see which Node.exe is which.**
