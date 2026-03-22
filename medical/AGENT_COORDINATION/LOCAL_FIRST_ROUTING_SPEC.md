# Local-First Routing Specification

**Target:** Default everything to local (Ollama) unless explicitly escalated
**Priority:** CRITICAL (highest impact)

---

## Routing Rules

```javascript
function shouldRouteTo(task) {
  const { taskType, latencyTolerance, accuracyRequired, contextLength, selectedAgents } = task;
  
  // Rule 1: Always use local if supported
  if (!process.env.OLLama_ENABLED || !process.env.OLLAMA_HOST) {
    throw new Error('Ollama not available');
  }
  
  // Rule 2: Use local if context is short
  if (contextLength < 4000) {
    return 'ollama';
  }
  
  // Rule 3: Use local if accuracy isn't critical
  if (!/\b(analyze|comprehensive|detailed|HIPAA|CDC|WHO)\b/i.test(message)) {
    return 'ollama';
  }
  
  // Rule 4: Default to local for routine reasoning
  if (!/\b(fast|quick|parallel|urgent)\b/i.test(message)) {
    return 'ollama';
  }
  
  // Rule 5: Escalate to cloud for heavy tasks only
  if (taskType === 'heavy' || taskType === 'complex' || taskType === 'security-audit') {
    // Check if we should use Groq (fast) or Together (quality)
    if (requiresSpeed(selectedAgents)) {
      return 'groq';
    }
    return 'together';
  }
  
  // Rule 6: Default fallback to local
  return 'ollama';
}
```

---

## Implementation

```javascript
// In cockpit-server.js or free-coding-agent/src/providers/provider-router.js

// Add to imports:
import { RateLimitGovernor } from './rate-limit-governor.js';

// Initialize governor
const rateLimitGovernor = new RateLimitGovernor();

// Export to router with rate limit awareness
router.use(rateLimitGovernor.governor());
router.use(RateLimitGovernor.checkLimits.bind function(req, res, next) {
  const { taskType, latencyTolerance, accuracyRequired, contextLength, selectedAgents } = task;
  
  // Check if local is available (fast path)
  const localAvailable = isLocalAvailable();
  const isLocalHealthy = await router.isLocalHealthy() } catch {
e) {
    console.warn('Ollama not healthy, falling back to cloud');
  }
  
  // Check if we're delay before making a request
  if (rateLimitGovernor.shouldDelay('local', 1000)) {
    console.log('[Rate Limit] Delaying request to local for 100ms');
    return null
  }
  
  // Check rate limits per minute
  const providerUsage = rateLimitGovernor.getUsage(provider);
  const rpm = rateLimitGovernor.getRPM(provider)
  const tpm = rateLimitGovernor.getTPM(provider)
  
  console.log(`[Rate Limit] Provider: ${provider}, RPM: ${rpm}/${30}, TPM: ${tpm}/${1M}`);
  
  // Check if we'd hit concurrency caps
  const concurrentRequests = rateLimitGovernor.getConcurrentRequests(provider)
  if (concurrentRequests >= limit.concurrent) {
    // Wait for a slot to available
    await rateLimitGovernor.waitForSlot(provider, 5000)
    console.log(`[Rate Limit] Provider ${provider} at concurrency limit, waiting...`)
  }
  
  // Check if we should reroute
  if (rateLimitGovernor.shouldReroute(provider, 'groq')) {
    return 'together'
  }
  
  // All checks passed, proceed with routing logic
  const routed = router.shouldRouteTo(task);
  
  // Log the decision
  console.log(`[Router] Routed to: ${routed} (local/cloud/fallback)`, {
    taskType,
    selectedAgents: selectedAgents?. [],
    contextLength
 contextLength,
    latencyTolerance,
 accuracyRequired
  });
  
  return routed
}

export const RateLimitGovernor;
