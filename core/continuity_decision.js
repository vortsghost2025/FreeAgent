/**
 * Pure decision table for continuity gate.
 * 
 * Inputs:
 *   - authoritativeMismatch: boolean
 *   - continuityMismatch: boolean
 *   - hashMismatch: boolean
 *   - phenotypeSimilarity: number (0 to 1)
 * 
 * Outputs:
 *   - action: one of ['CONTINUE', 'QUARANTINE', 'QUARANTINE_REVIEW', 'BLOCK', 'ESCALATE', 'WARN']
 *   - overrideAllowed: boolean
 * 
 * Decision table (Phase 0):
 * We define a simple set of rules for demonstration.
 * 
 * Rules:
 * 1. If authoritativeMismatch -> ESCALATE (overrideAllowed: false)
 * 2. Else if hashMismatch -> QUARANTINE (overrideAllowed: true)
 * 3. Else if continuityMismatch -> QUARANTINE_REVIEW (overrideAllowed: true)
 * 4. Else if phenotypeSimilarity < 0.5 -> WARN (overrideAllowed: true)
 * 5. Else -> CONTINUE (overrideAllowed: true)
 * 
 * Note: This is a placeholder and can be adjusted based on requirements.
 */
function makeContinuityDecision({ authoritativeMismatch, continuityMismatch, hashMismatch, phenotypeSimilarity }) {
  if (authoritativeMismatch) {
    return { action: 'ESCALATE', overrideAllowed: false };
  }
  if (hashMismatch) {
    return { action: 'QUARANTINE', overrideAllowed: true };
  }
  if (continuityMismatch) {
    return { action: 'QUARANTINE_REVIEW', overrideAllowed: true };
  }
  if (phenotypeSimilarity < 0.5) {
    return { action: 'WARN', overrideAllowed: true };
  }
  return { action: 'CONTINUE', overrideAllowed: true };
}

module.exports = { makeContinuityDecision };