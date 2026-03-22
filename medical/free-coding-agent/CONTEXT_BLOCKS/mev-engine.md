# 🚀 MEV Engine — Kilo-Ready Context Block

## 🎯 Current Objective
Maintain and operate the MEV (Maximal Extractable Value) trading engine with proper risk controls and configuration.

## 📁 Active Folder
```
C:/workspace/medical/mev-swarm/
```
(EXTERNAL to main workspace - separate project!)

## 🔧 Key Subsystems

### Main Entry Points
| File | Purpose |
|------|---------|
| `index.js` | Main entry point |
| `mev-swarm.js` | Main entry |
| `simple-launcher.js` | Simple starter |
| `launcher-v4-adaptive-final.js` | Adaptive launcher |
| `direct-launch.js` | Direct launcher |

### Core Modules (in `core/`)
| Module | Purpose |
|--------|---------|
| `core/mcp/` | MCP orchestration (Chamber 7) |
| `core/mempool/` | Mempool integration (Chamber 5) |
| `core/optimizer/` | Trade size optimization |
| `core/gas/` | Gas & profitability (Chamber 4) |
| `core/graph/` | Arbitrage graph |

### Agents
| File | Purpose |
|------|---------|
| `arb-agent.js` | Arbitrage detection |
| `liquidator-agent.js` | Liquidation |
| `strategy-worker.js` | Strategy execution |

### Configuration
| File | Purpose |
|------|---------|
| `thresholds.js` | Bot thresholds |
| `constants.js` | Constants |
| `.env` | Environment vars |

## 🚧 Known Issues (Historical)
- Multiple launcher versions (v1-v4, adaptive, modular)
- Multiple executor variations
- Gas optimization issues
- Deployment complexity

## ✅ Working (Per Last Status)
- Pool watching functional
- Arbitrage detection working
- MCP tools defined
- WETH decoding bug fixed
- Accurate on-chain PnL restored
- Zero-loss threshold validated
- Ensemble injection validated
- Multi-agent build confirmed (Kilo → Claw → Simple)
- Context blocks rebuilt
- Deterministic boot achieved
- Cockpit spine restored

## 📌 Safety Rules
- NEVER execute without simulation first
- NEVER exceed position limits
- ALWAYS use thresholds.js for limits
- ALWAYS log before/after trades
- Paper trade before real funds

---

## 🚀 Success Criteria
- [x] Single canonical launcher identified
- [x] Thresholds documented
- [x] Safety guards verified
- [x] Execution logs working
- [x] No ghost folders
- [x] Ensemble injection validated
- [x] Multi-agent build confirmed
- [x] Context blocks rebuilt
- [x] Deterministic boot achieved
- [x] Cockpit spine restored

## 🔗 Integration Status
- MEV Engine → Medical Ensemble: **Validated**
- Kilo → Claw → Simple: **Working**
- WebSocket Routing: **Verified**
- Browser Automation: **Active**

## 📍 MEV Location
- Project: `C:/workspace/medical/mev-swarm/`
- Cockpit: `c:/workspace/medical/free-coding-agent/`
