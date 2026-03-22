# Organization Plan - Consolidate Everything

**Goal:** ONE unified interface. No new dashboards. Merge what exists.

---

## ✅ PROGRESS (Feb 24, 2026)

### Completed
- [x] Created unified-shell.html (tab shell with 5 tabs)
- [x] Created swarm-tab.html (links to swarm dashboard)
- [x] Created health-tab.html (links to WHO/CDC dashboard)
- [x] Archived swarm-ui-with-compute-router.html to _holding/
- [x] Archived swarm-index.html to _holding/
- [x] Archived test files (complete_expansion_explorer.html, test-sftp.html, frontend.html)

### Route Available
- **http://localhost:8889/shell** - Unified tab interface

### Files Archived
```
C:\workspace\_holding\
├── swarm-ui-with-compute-router.html
├── swarm-index.html
├── complete_expansion_explorer.html
├── test-sftp.html
└── frontend.html
```

---

## WHAT EXISTS NOW (After Cleanup)

```
C:\workspace\
├── medical\                          # Port 8889
│   ├── mega-cockpit.html             ← Main medical UI
│   ├── unified-ide.html              ← Code workspace
│   ├── benchmark-dashboard.html      ← Performance metrics
│   └── cockpit-server.js             ← Backend
│
├── swarm-ui.html                     ← Swarm dashboard
├── swarm-ui-with-compute-router.html ← Another swarm
├── swarm-test-panel.html             ← Swarm tests
├── swarm-index.html                  ← Swarm index
│
├── we4free_global\
│   └── health-dashboard.html         ← WHO/CDC health
│
├── global-weather-federation\
│   └── (weather dashboards)
│
├── autonomous-elasticsearch-evolution-agent\
│   └── ai-environment-dashboard.html ← 48-layer memory
│
└── (50+ architecture docs scattered)
```

---

## THE PLAN: ONE SHELL TO RULE THEM ALL

### Phase 1: Create the Unified Shell (30 min)

Create ONE file: `C:\workspace\medical\public\unified-shell.html`

```html
<!DOCTYPE html>
<html>
<head>
  <title>Unified Federation Cockpit</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui; background: #0a0e1a; color: white; height: 100vh; display: flex; flex-direction: column; }

    .header { background: linear-gradient(135deg, #1e3a8a, #1e40af); padding: 12px 20px; display: flex; align-items: center; gap: 20px; }
    .logo { font-size: 1.5rem; font-weight: bold; }
    .logo span { color: #4fc3f7; }

    .tabs { display: flex; gap: 4px; margin-left: 20px; }
    .tab { padding: 10px 20px; background: rgba(255,255,255,0.1); border: none; color: white; cursor: pointer; border-radius: 8px 8px 0 0; font-size: 14px; }
    .tab:hover { background: rgba(255,255,255,0.2); }
    .tab.active { background: #0a0e1a; }

    .status-bar { margin-left: auto; display: flex; gap: 20px; font-size: 12px; }
    .status-item { display: flex; align-items: center; gap: 6px; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; }
    .status-dot.online { background: #10b981; }
    .status-dot.offline { background: #ef4444; }

    .content { flex: 1; position: relative; }
    iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; display: none; }
    iframe.active { display: block; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🦞 <span>Claw</span> Federation</div>
    <div class="tabs">
      <button class="tab active" data-target="medical">🏥 Medical</button>
      <button class="tab" data-target="swarm">🐝 Swarm</button>
      <button class="tab" data-target="health">🌍 Health Intel</button>
      <button class="tab" data-target="weather">🌤️ Weather</button>
      <button class="tab" data-target="aienv">🧠 AI Environment</button>
    </div>
    <div class="status-bar">
      <div class="status-item"><span class="status-dot online"></span> Medical: 8 agents</div>
      <div class="status-item"><span class="status-dot online"></span> Ollama: llama3.1:8b</div>
      <div class="status-item"><span class="status-dot" id="groqStatus"></span> Groq</div>
    </div>
  </div>
  <div class="content">
    <iframe id="medical" class="active" src="/mega-cockpit.html"></iframe>
    <iframe id="swarm" src="http://localhost/swarm-ui.html"></iframe>
    <iframe id="health" src="http://localhost/we4free_global/health-dashboard.html"></iframe>
    <iframe id="weather" src="http://localhost/global-weather-federation/dashboard.html"></iframe>
    <iframe id="aienv" src="http://localhost:4001/ai-environment-dashboard.html"></iframe>
  </div>
  <script>
    document.querySelectorAll('.tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('iframe').forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.target).classList.add('active');
      };
    });
    // Poll health status
    setInterval(async () => {
      try {
        const r = await fetch('/api/providers/status');
        const d = await r.json();
        const groqDot = document.getElementById('groqStatus');
        groqDot.className = 'status-dot ' + (d.providers?.groq?.healthy ? 'online' : 'offline');
      } catch(e) {}
    }, 30000);
  </script>
</body>
</html>
```

### Phase 2: Move All Public Files (30 min)

Move dashboards to one location:
```
C:\workspace\medical\public\
├── unified-shell.html        ← THE ONE UI
├── mega-cockpit.html         ← Medical tab content
├── unified-ide.html          ← IDE tab content
├── swarm-ui.html             ← Moved from C:\workspace\
├── health-dashboard.html     ← Moved from we4free_global\
├── weather-dashboard.html    ← Moved from global-weather-federation\
└── ai-environment.html       ← Moved from autonomous-elasticsearch\
```

### Phase 3: Update cockpit-server.js (10 min)

Add route:
```javascript
app.get('/unified', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'unified-shell.html'));
});
```

### Phase 4: Clean Up (20 min)

- Delete duplicate swarm UIs (keep one)
- Archive old dashboards to `_holding/`
- Update all internal links

---

## THE RESULT

ONE URL: `http://localhost:8889/unified`

```
┌─────────────────────────────────────────────────────────────────────┐
│  🦞 Claw Federation                                                  │
│  [Medical] [Swarm] [Health] [Weather] [AI Env]    ● Medical: 8 agents│
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                    ACTIVE TAB CONTENT (iframe)                       │
│                                                                      │
│  Each existing dashboard loads here - no code merge needed           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## TASKS FOR KILO

1. **Create unified-shell.html** in `C:\workspace\medical\public\`
2. **Add `/unified` route** to cockpit-server.js
3. **Test it loads** at http://localhost:8889/unified
4. **(Optional) Move dashboards** to public/ for cleaner paths

---

## FILES TO KEEP vs ARCHIVE

### KEEP (Active)
- `medical/` - Main system
- `we4free_global/health-dashboard.html` - WHO health
- `global-weather-federation/` - Weather
- `autonomous-elasticsearch-evolution-agent/ai-environment-dashboard.html` - 48-layer

### ARCHIVE (Duplicates/Old)
- `swarm-ui-with-compute-router.html` → archive (use swarm-ui.html)
- `swarm-test-panel.html` → keep for testing
- `swarm-index.html` → archive (not needed)
- All files in `cleanup-2026-02-22/` → already archived

---

**This is the plan. One shell. Five tabs. Zero new dashboards.** 🦞

Want me to have Kilo build the unified-shell.html now?
