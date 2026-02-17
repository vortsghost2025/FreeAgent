# Browser DevTools Testing Instructions for Claude Edge Extension

**Context:** Testing medical module UI at `http://localhost/medical/ui/medical-ui.html`

## Your Mission
You are helping test a medical data processing pipeline in the browser. The page should load a UI that runs 5 agents through a pipeline to process medical data.

## What to Check

### 1. Console Errors (F12 → Console)
**Look for:**
- ❌ Module import errors (ES6 vs CommonJS mismatch)
- ❌ `Cannot find module` errors
- ❌ CORS errors
- ❌ 404 errors for missing files
- ✅ Should see agent processing logs when pipeline runs

**Report back:**
- Any red errors?
- What do the error messages say?
- Are there any module loading issues?

### 2. Network Tab (F12 → Network)
**Look for:**
- Failed requests (red status codes)
- 404s for JavaScript files
- Any files that aren't loading

**Report back:**
- All files loading successfully?
- Any 404s or 500s?

### 3. UI Elements
**Check that these exist:**
- Textarea for input data
- "Run Pipeline" button
- "Load Example" button
- Pipeline visualization (5 steps)
- Output box

**Report back:**
- All buttons present and clickable?
- Any layout issues?

### 4. Functional Test
**Steps:**
1. Click "Load Example" button
2. Click "Run Pipeline" button
3. Watch pipeline visualization
4. Check output box

**Report back:**
- Did the pipeline run?
- Did agents light up in sequence?
- Is there output in the output box?
- Any errors during execution?

### 5. Module System Issue (Expected)
The UI uses ES6 `import` but our modules use CommonJS `require()`. This will likely fail.

**If you see:** `Cannot use import statement outside a module`
**Report:** "Confirmed: ES6/CommonJS mismatch - need to convert or bundle"

## Expected File Structure
```
http://localhost/medical/ui/medical-ui.html (the UI)
http://localhost/medical/medical-workflows.js (orchestrator)
http://localhost/medical/agents/*.js (agent files)
```

## Summary Template
Please respond with:
```
✅ Page loaded: [yes/no]
✅ Console errors: [list them or "none"]
✅ Network errors: [list them or "none"]
✅ UI elements present: [yes/no]
✅ Pipeline executed: [yes/no]
✅ Main issue: [describe]
```

---

**Paste this entire document to Claude in Edge when you open DevTools!**
