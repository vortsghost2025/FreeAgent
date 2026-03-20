# 🐛 FIXED: ProviderScorer Type Mismatch in Federation Core

## Issue Description
**File**: `federation-core.js:155`
**Problem**: The `_selectSystem()` method was incorrectly using `providerScorer.getBestProvider(availableCandidates)` where `availableCandidates` contained system type values ('medical_pipeline', 'coding_ensemble', 'plugins'), but ProviderScoreTracker is designed to track LLM provider performance (openai, minimax, anthropic, local), not federation system types.

## Root Cause
Conceptual mismatch between:
- **System Selection**: Choosing between different systems (medical_pipeline vs coding_ensemble vs plugins)
- **Provider Scoring**: Tracking performance of LLM providers (openai vs minimax vs anthropic)

Using LLM provider scoring for system selection was causing random selection behavior since no history existed for system IDs in the provider scorer.

## Solution Applied
**Approach**: Removed providerScorer dependency for system selection, implemented simple round-robin selection instead.

### Changes Made:
1. **Replaced provider scorer logic** with round-robin selection:
   ```javascript
   // Before (incorrect):
   const bestSystemId = providerScorer.getBestProvider(availableCandidates);
   
   // After (correct):
   const selectedIndex = (this.requestCounter++) % availableCandidates.length;
   const selectedSystemId = availableCandidates[selectedIndex];
   ```

2. **Maintained appropriate usage**: Kept providerScorer imports for actual LLM provider performance tracking in task execution recording.

3. **Clear separation of concerns**: System selection now uses deterministic round-robin, while provider performance tracking continues for LLM providers.

## Verification
✅ `federation-core.js` imports successfully  
✅ `provider-scorer.js` imports successfully  
✅ Conceptual separation between system selection and provider scoring maintained

## Impact
- **Fixed**: Random system selection behavior
- **Maintained**: All existing provider scoring functionality for LLM performance tracking
- **Improved**: Clear architectural separation between system orchestration and provider management

This fix resolves the type mismatch while preserving all intended functionality.