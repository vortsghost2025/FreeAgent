# Quick Start Guide

Get a scientific workflow running in 5 minutes.

---

## Prerequisites

- **Web Browser**: Chrome, Firefox, Edge, or Safari
- **Web Server**: IIS (Windows), Apache, or any HTTP server
- **Git**: For cloning the repository

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/vortsghost2025/Deliberate-AI-Ensemble.git
cd Deliberate-AI-Ensemble
```

---

## Step 2: Set Up Web Server

### Option A: Windows (IIS)

1. **Copy files to wwwroot:**
```powershell
Copy-Item -Path "we4free_global\*" -Destination "C:\inetpub\wwwroot\" -Recurse -Force
Copy-Item -Path "*.js" -Destination "C:\inetpub\wwwroot\" -Force
```

2. **Open in browser:**
```powershell
Start-Process "http://localhost/genomics-ui.html"
```

### Option B: macOS/Linux (Python HTTP Server)

1. **Start local server:**
```bash
cd we4free_global
python3 -m http.server 8000
```

2. **Open in browser:**
```bash
open http://localhost:8000/genomics-ui.html  # macOS
xdg-open http://localhost:8000/genomics-ui.html  # Linux
```

### Option C: Node.js (http-server)

1. **Install http-server:**
```bash
npm install -g http-server
```

2. **Start server:**
```bash
cd we4free_global
http-server -p 8000
```

3. **Open**: http://localhost:8000/genomics-ui.html

---

## Step 3: Run Your First Workflow

### GWAS Analysis (Genomics)

1. **Open the UI**: Navigate to `genomics-ui.html` in your browser

2. **Click "Run GWAS Analysis"**

3. **Watch the workflow execute**:
   - 50 samples split into 10 chunks
   - Map phase: Parallel variant calling
   - Reduce phase: Aggregate statistics
   - Results displayed in 1-2 seconds

4. **View results**:
   ```json
   {
     "topHits": [
       {"chr": "chr5", "pos": 952194, "pValue": 2.07e-6}
     ],
     "significantLoci": [],
     "sampleCount": 50,
     "duration": 1318
   }
   ```

---

## Step 4: Explore Other Domains

### Evolutionary Biology (Coming Soon)
```javascript
// Example: Phylogenetic Analysis
runPhylogeneticAnalysis(sequences, {
  method: 'neighbor-joining',
  bootstrapReplicates: 100
});
```

### Climate Science (Coming Soon)
```javascript
// Example: Climate Projection
runClimateProjection(
  ['RCP2.6', 'RCP4.5', 'RCP8.5'],
  regions,
  2020,
  2100
);
```

---

## Understanding the Console Output

When you run a workflow, you'll see:

```
📊 Starting GWAS Workflow: gwas-1771270849081 (50 samples)
🚀 Starting Map/Reduce job mr-0 with 50 items
📊 Map phase: 10 chunks
✋ Task mr-0-map-0 claimed by genomics-agent-5
📊 GWAS map: processing 5 samples
✅ Task mr-0-map-0 completed
🔄 Reduce phase: aggregating 10 results
📊 GWAS reduce: input results = Array(10)
✅ GWAS reduce: output = Object
✅ Map/Reduce job mr-0 completed in 1318ms
✅ GWAS Workflow completed: gwas-1771270849081 (1318ms)
```

This shows:
- **Map phase**: 10 chunks processed in parallel by 4 workers
- **Reduce phase**: Results aggregated into final output
- **Completion**: Total time < 2 seconds

---

## Troubleshooting

### Issue: "Failed to load resource"

**Cause**: Files not in web server directory

**Fix**:
```powershell
# Windows
Copy-Item -Path "we4free_global\*" -Destination "C:\inetpub\wwwroot\" -Force

# macOS/Linux
cp we4free_global/* /var/www/html/  # Apache
```

### Issue: "Agent not found" or tasks timing out

**Cause**: JavaScript modules not loaded

**Fix**:
1. Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (macOS)
2. Check browser console for errors
3. Verify all `.js` files are in the same directory as `genomics-ui.html`

### Issue: Results show undefined fields

**Cause**: Orchestrator boundary issue (old bug, should be fixed)

**Fix**:
1. Pull latest code: `git pull origin master`
2. Copy updated files to web server
3. Hard refresh browser

---

## Next Steps

1. **Read the docs**: [ARCHITECTURE_VALIDATION.md](ARCHITECTURE_VALIDATION.md)
2. **Explore the code**: Start with `genomics-workflows.js`
3. **Add a domain**: See [README.md - Adding New Domains](README.md#-adding-new-domains)
4. **Contribute**: Found a bug? Open an issue on GitHub

---

## Architecture Overview

```
Your Browser
    ↓
genomics-ui.html (loads modules)
    ↓
┌─────────────────────────────────────┐
│   Universal Infrastructure          │
├─────────────────────────────────────┤
│ • task-queue.js                     │
│ • swarm-coordinator.js              │
│ • distributed-compute.js            │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│   Domain Layer (Genomics)           │
├─────────────────────────────────────┤
│ • genomics-agent-roles.js           │
│ • genomics-workflows.js             │
└─────────────────────────────────────┘
    ↓
Map/Reduce Execution
    ↓
Results Displayed
```

---

## Running Multiple Workflows

```javascript
// Run workflows sequentially
await runGWASWorkflow();
await runVariantCallingWorkflow();
await runFederatedLearningWorkflow();

// Or run the same workflow multiple times
for (let i = 0; i < 10; i++) {
  await runGWASWorkflow();
}
```

---

## Performance Tips

1. **Horizontal Scaling**: Add more workers in `genomics-ui.html`:
   ```javascript
   const agentRoles = [
     GenomicsAgentRole.GWAS_MAP_WORKER,  // Worker 1
     GenomicsAgentRole.GWAS_MAP_WORKER,  // Worker 2
     GenomicsAgentRole.GWAS_MAP_WORKER,  // Worker 3
     GenomicsAgentRole.GWAS_MAP_WORKER,  // Worker 4
     GenomicsAgentRole.GWAS_MAP_WORKER,  // Worker 5 (add more!)
   ];
   ```

2. **Chunk Size**: Adjust in workflows for optimal parallelization

3. **Browser Console**: Keep DevTools open to monitor performance

---

## Support

- **Issues**: [GitHub Issues](https://github.com/vortsghost2025/Deliberate-AI-Ensemble/issues)
- **Email**: [ai@deliberateensemble.works](mailto:ai@deliberateensemble.works)
- **Twitter**: [@WEFramework](https://twitter.com/WEFramework)

---

**Ready to build?** Start exploring the code and see how easy it is to add new domains!
