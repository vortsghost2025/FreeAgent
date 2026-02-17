# Medical Module Testing Context

**Share this with Claude Edge Extension for context**

## What We Built
A medical data processing pipeline with 5 agents:
1. Ingestion - Normalizes raw input
2. Triage - Classifies into 6 types
3. Summarization - Extracts structured fields
4. Risk - Scores structural risk factors
5. Output - Formats with audit trail

## File Locations
- **UI:** `C:\inetpub\wwwroot\medical\ui\medical-ui.html`
- **URL:** `http://localhost/medical/ui/medical-ui.html`
- **Agents:** `C:\inetpub\wwwroot\medical\agents\*.js`
- **Orchestrator:** `C:\inetpub\wwwroot\medical\medical-workflows.js`

## Known Issues
- **Module System:** UI uses ES6 imports, files use CommonJS exports
  - Files have `module.exports = {...}`
  - UI has `import { ... } from '...'`
  - This will fail in browser without bundler

## What Should Happen (if working)
1. Load example data (symptoms/labs/notes/etc.)
2. Click "Run Pipeline"
3. See 5 agent steps light up in sequence
4. Output appears with:
   - Classification type
   - Confidence score
   - Risk score
   - Processing time
   - Audit log

## What Will Probably Happen
Browser console error: `Cannot use import statement outside a module`

**Solution needed:** Either:
- Convert to ES6 modules (`export` instead of `module.exports`)
- Use a bundler (webpack/rollup)
- Inline the code in the HTML

## Testing Goals
1. Confirm module loading issue
2. Check if UI loads at all
3. Verify all files are accessible via HTTP
4. Test if any part works

---
**Paste this to Claude Edge for context, then open DevTools**
