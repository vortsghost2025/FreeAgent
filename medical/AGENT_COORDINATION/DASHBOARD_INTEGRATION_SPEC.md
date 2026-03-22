# Dashboard Integration Specification

**Target:** Serve ALL dashboards from port 8889
**File to Modify:** `C:\workspace\medical\cockpit-server.js`

---

## CURRENT STATE

| Dashboard | Current Location | Status |
|-----------|------------------|--------|
| Mega Cockpit | :8889/ | ✅ Working |
| Unified IDE | :8889/unified-ide.html | ✅ Working |
| Benchmark | :8889/benchmark-dashboard.html | ✅ Working |
| Swarm UI | localhost/swarm-ui.html | ❌ External |
| Health Dashboard | file:///C:/workspace/... | ❌ File |
| Weather | Not integrated | ❌ Missing |
| AI Environment | localhost:4001/... | ❌ Different port |

---

## TARGET STATE

| Dashboard | Target URL | Status |
|-----------|------------|--------|
| Unified Shell | :8889/ | Main entry |
| Mega Cockpit | :8889/cockpit | Tab content |
| Unified IDE | :8889/ide | Tab content |
| Benchmark | :8889/benchmark | Tab content |
| Swarm | :8889/swarm | Tab content |
| Health | :8889/health | Tab content |
| Weather | :8889/weather | Tab content |

---

## IMPLEMENTATION

### Step 1: Copy Dashboard Files

Move/copy external dashboards into medical public folder:

```powershell
# Copy swarm UI
Copy-Item "C:\workspace\swarm-ui.html" "C:\workspace\medical\public\swarm.html"

# Copy health dashboard
Copy-Item "C:\workspace\we4free_global\health-dashboard.html" "C:\workspace\medical\public\health.html"

# Copy weather dashboard (if exists)
Copy-Item "C:\workspace\global-weather-federation\dashboard.html" "C:\workspace\medical\public\weather.html" -ErrorAction SilentlyContinue
```

### Step 2: Add Routes in cockpit-server.js

```javascript
// Add these routes after existing static routes

// Unified Shell (main entry)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'unified-shell.html'));
});

// Individual dashboard routes
app.get('/cockpit', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mega-cockpit.html'));
});

app.get('/ide', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'unified-ide.html'));
});

app.get('/benchmark', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'benchmark-dashboard.html'));
});

app.get('/swarm', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'swarm.html'));
});

app.get('/health', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'health.html'));
});

app.get('/weather', (req, res) => {
  const weatherPath = path.join(__dirname, 'public', 'weather.html');
  if (fs.existsSync(weatherPath)) {
    res.sendFile(weatherPath);
  } else {
    res.status(404).send('Weather dashboard not yet integrated');
  }
});
```

### Step 3: Update unified-shell.html

Update the iframe sources:

```html
<div class="content">
  <iframe id="medical" class="active" src="/cockpit"></iframe>
  <iframe id="swarm" src="/swarm"></iframe>
  <iframe id="health" src="/health"></iframe>
  <iframe id="benchmark" src="/benchmark"></iframe>
  <iframe id="ide" src="/ide"></iframe>
</div>
```

### Step 4: Fix Relative Paths in Copied Dashboards

The copied dashboards may have relative paths that break. Check and fix:

In `swarm.html`:
```html
<!-- Change -->
<script src="./swarm-coordinator.js"></script>
<!-- To -->
<script src="/swarm-coordinator.js"></script>
```

Copy supporting files:
```powershell
Copy-Item "C:\workspace\swarm-coordinator.js" "C:\workspace\medical\public\"
Copy-Item "C:\workspace\swarm-coordinator-compute-router.js" "C:\workspace\medical\public\" -ErrorAction SilentlyContinue
```

---

## ROUTE SUMMARY

Add to `cockpit-server.js`:

```javascript
// Dashboard Routes
const dashboardRoutes = {
  '/': 'unified-shell.html',      // Main entry
  '/cockpit': 'mega-cockpit.html',
  '/ide': 'unified-ide.html', 
  '/benchmark': 'benchmark-dashboard.html',
  '/swarm': 'swarm.html',
  '/health': 'health.html',
  '/weather': 'weather.html',
  '/shell': 'unified-shell.html'  // Alias
};

Object.entries(dashboardRoutes).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    const filePath = path.join(__dirname, 'public', file);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send(`Dashboard not found: ${file}`);
    }
  });
});
```

---

## FILE STRUCTURE AFTER

```
C:\workspace\medical\public\
├── unified-shell.html     ← Main entry (tabs)
├── mega-cockpit.html      ← Medical agents
├── unified-ide.html       ← Code workspace
├── benchmark-dashboard.html ← Performance
├── swarm.html             ← Copied from workspace
├── health.html            ← Copied from we4free_global
├── weather.html           ← Copied from weather federation
├── swarm-coordinator.js   ← Supporting file
└── ...
```

---

## TESTING

```powershell
# Test each route
curl http://localhost:8889/
curl http://localhost:8889/cockpit
curl http://localhost:8889/ide
curl http://localhost:8889/benchmark
curl http://localhost:8889/swarm
curl http://localhost:8889/health
```

---

## FOR KILO TO IMPLEMENT

1. Copy dashboard files to `medical/public/`
2. Add route definitions to `cockpit-server.js`
3. Update `unified-shell.html` iframe sources
4. Copy supporting JS files
5. Test all routes
6. Restart server

---

**Spec complete. Ready for Kilo to implement.** 🦞
