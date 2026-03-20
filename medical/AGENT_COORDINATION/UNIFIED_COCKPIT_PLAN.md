# Unified Cockpit Integration Plan

**Created by:** Claw 🦞
**Date:** February 24, 2026
**Status:** Architecture Recommendation for Sean

---

## THE CHALLENGE

You have 4+ separate cockpits/dashboards that need to merge into ONE:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CURRENT STATE (Fragmented)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  SWARM COCKPIT   │  │  MEGA COCKPIT    │  │ HEALTH DASHBOARD │   │
│  │  swarm-ui.html   │  │  mega-cockpit    │  │ health-dashboard │   │
│  │  (C:\workspace)  │  │  (medical)       │  │  (we4free_global)│   │
│  │                  │  │                  │  │                  │   │
│  │ • Swarm agents   │  │ • 8 medical      │  │ • WHO/CDC/NASA   │   │
│  │ • Compute router │  │ • Smart routing  │  │ • Disease pred   │   │
│  │ • Federation     │  │ • Provider mesh  │  │ • Climate-health │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              AI ENVIRONMENT DASHBOARD                         │   │
│  │              (autonomous-elasticsearch-evolution-agent)       │   │
│  │                                                               │   │
│  │  • 48-layer memory • Multi-agent coord • Elasticsearch       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## THE SOLUTION: TAB-BASED UNIFICATION

Don't merge the code. Merge the **interface**. Each cockpit becomes a tab.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    UNIFIED COCKPIT (localhost:8889)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  [MEDICAL] [WEATHER] [MENTAL HEALTH] [SWARM] [AI ENV]       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │              ACTIVE TAB CONTENT (iframe or component)       │    │
│  │                                                             │    │
│  │  Each tab loads its existing dashboard:                     │    │
│  │  • Medical → mega-cockpit.html                              │    │
│  │  • Weather → weather-federation dashboard                   │    │
│  │  • Mental Health → health-dashboard.html                    │    │
│  │  • Swarm → swarm-ui.html                                    │    │
│  │  • AI Env → ai-environment-dashboard.html                   │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  SHARED STATUS BAR                                          │    │
│  │  Agent Status | Provider | Memory | Last Sync | Alerts      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## IMPLEMENTATION OPTIONS

### Option A: iframe Tab Shell (Easiest - 2 hours)

Create a simple shell HTML that loads each dashboard in an iframe:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Unified Federation Cockpit</title>
  <style>
    .tab { display: inline-block; padding: 10px 20px; cursor: pointer; }
    .tab.active { background: #4285f4; color: white; }
    .content { height: calc(100vh - 100px); }
    iframe { width: 100%; height: 100%; border: none; display: none; }
    iframe.active { display: block; }
  </style>
</head>
<body>
  <div class="tabs">
    <div class="tab active" data-target="medical">🏥 Medical</div>
    <div class="tab" data-target="weather">🌤️ Weather</div>
    <div class="tab" data-target="mental">🧠 Mental Health</div>
    <div class="tab" data-target="swarm">🐝 Swarm</div>
    <div class="tab" data-target="aienv">🤖 AI Environment</div>
  </div>
  <div class="content">
    <iframe id="medical" class="active" src="/public/mega-cockpit.html"></iframe>
    <iframe id="weather" src="../global-weather-federation/dashboard.html"></iframe>
    <iframe id="mental" src="../we4free_global/health-dashboard.html"></iframe>
    <iframe id="swarm" src="../swarm-ui.html"></iframe>
    <iframe id="aienv" src="../../autonomous-elasticsearch-evolution-agent/ai-environment-dashboard.html"></iframe>
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
  </script>
</body>
</html>
```

**Pros:**
- Fastest to implement
- Each dashboard keeps working independently
- No code merge needed
- Easy to add new tabs

**Cons:**
- Each iframe has its own memory
- Styling not unified
- Communication between tabs requires postMessage

---

### Option B: Web Components (Medium - 1-2 days)

Convert each dashboard to a Web Component, then compose:

```javascript
class MedicalCockpit extends HTMLElement { ... }
class WeatherDashboard extends HTMLElement { ... }
class SwarmUI extends HTMLElement { ... }

// In unified-cockpit.html:
<medical-cockpit></medical-cockpit>
<weather-dashboard></weather-dashboard>
<swarm-ui></swarm-ui>
```

**Pros:**
- Better encapsulation
- Shared styling possible
- One page load

**Cons:**
- Requires refactoring each dashboard
- More complex

---

### Option C: Full Merge (Hard - 1 week)

Actually merge all the code into one unified dashboard.

**Pros:**
- Most polished result
- Shared state, single memory footprint

**Cons:**
- Significant effort
- Risk of breaking things
- CSS conflicts to resolve

---

## MY RECOMMENDATION: Option A (iframe Shell)

**Why:**
1. You can have it working in 2 hours
2. Each system keeps working independently
3. Easy to debug (isolate problems to one tab)
4. Can progressively improve later

**Implementation:**

1. Create `C:\workspace\medical\public\unified-shell.html`
2. Add tab navigation
3. Load each existing dashboard in iframe
4. Add shared status bar that polls all systems

---

## SHARED STATUS BAR

The only truly "unified" part should be a status bar showing:

```
┌────────────────────────────────────────────────────────────────────┐
│ 🏥 Medical: 8 agents ● | 🌤️ Weather: 14 phases ● | 🧠 MH: Mesh ● │
│ Provider: Ollama (llama3.1:8b) | Memory: 48 layers | Alerts: 0   │
└────────────────────────────────────────────────────────────────────┘
```

This polls:
- `/api/health` from medical server (port 8889)
- `/health` from weather server (if running)
- WebRTC mesh status from mental health
- Swarm status from swarm coordinator

---

## NEXT STEPS (For Kilo to Implement)

1. **Create unified-shell.html** in `C:\workspace\medical\public\`
2. **Add tab navigation** for all 5 systems
3. **Test iframes** load correctly
4. **Add shared status bar** that polls health endpoints
5. **Update cockpit-server.js** to serve the shell at `/unified`

---

## FILE STRUCTURE AFTER

```
C:\workspace\medical\
├── public\
│   ├── unified-shell.html      ← NEW: Tab shell
│   ├── mega-cockpit.html       ← Existing: Medical
│   └── ...
├── cockpit-server.js           ← Add route for /unified

C:\workspace\swarm-ui.html                          ← Loaded via iframe
C:\workspace\we4free_global\health-dashboard.html   ← Loaded via iframe
C:\workspace\global-weather-federation\...          ← Loaded via iframe
C:\autonomous-elasticsearch-evolution-agent\...     ← Loaded via iframe
```

---

**For WE. For simplicity. For getting this done today.** 🦞

Let me know if you want Kilo to build the iframe shell, or if you want to discuss other approaches.
