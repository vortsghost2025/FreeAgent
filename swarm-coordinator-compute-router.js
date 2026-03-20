/**
 * Swarm Coordinator - Compute Router Upgrade
 *
 * Purpose: Add compute routing to prevent Phase 7 from crashing core agents
 *
 * Integration: Import into existing swarm-ui.html before closing </script>
 *
 * Architecture:
 *   - Shared compute engine: distributed-compute.js (Genomics/Medical)
 *   - Isolated compute engine: distributed-compute-evolution.js (Phase 7 only)
 *   - Router: Routes jobs by type to appropriate engine
 *   - Circuit Breaker: Protects core agents from compute failures
 *
 * Usage:
 *   1. Add to swarm-ui.html: <script src="swarm-coordinator-compute-router.js?v=4.0.0"></script>
 *   2. Swarm coordinator automatically loads router via SwarmRegistry
 */

// Compute Router Class
class ComputeRouter {
  constructor() {
    this.sharedCompute = null;
    this.phase7Compute = null;
    this.currentRouting = 'shared'; // 'shared' | 'phase7' | 'fallback'
  }

  initialize(sharedCompute, phase7Compute) {
    this.sharedCompute = sharedCompute;
    this.phase7Compute = phase7Compute;
    console.log('[ComputeRouter] Initialized with shared + phase7 engines');
  }

  async routeJob(jobType, payload) {
    const router = this.currentRouting;

    switch(jobType) {
      case 'genomics-map-reduce':
      case 'genomics-pipeline':
      case 'medical-diagnostic':
      case 'genomics-variant':
        // Genomics/Medical → shared compute
        if (this.sharedCompute) {
          return await this.sharedCompute.execute(payload);
        }
        router = 'shared';
        break;

      case 'phase7-autonomous':
      case 'phase7-evolution-cycle':
      case 'phase7-diagnostic':
      case 'phase7-proposal':
        // Phase 7 → isolated compute
        if (this.phase7Compute) {
          return await this.phase7Compute.execute(payload);
        }
        router = 'phase7';
        break;

      default:
        // Default to shared compute
        console.warn(`[ComputeRouter] Unknown job type: ${jobType}, routing to shared`);
        if (this.sharedCompute) {
          return await this.sharedCompute.execute(payload);
        }
    }
  }

  getCurrentRouting() {
      return this.currentRouting;
  }

  getCircuitBreakerStatus() {
    // Circuit breaker status for core agent protection
    return {
      isOpen: this.currentRouting !== 'shared',
      failureCount: 0,
      lastFailureTime: null
    };
  }
}

// Register with SwarmRegistry for automatic loading
if (typeof SwarmRegistry !== 'undefined') {
  try {
    SwarmRegistry.registerComponent('ComputeRouter', ComputeRouter);
    console.log('[ComputeRouter] Registered with SwarmRegistry');
  } catch (e) {
    console.warn('[ComputeRouter] SwarmRegistry.registerComponent not available:', e.message);
  }
}

// Expose ComputeRouter to window for browser usage
if (typeof window !== 'undefined') {
  window.ComputeRouter = ComputeRouter;
}

// Export for module loading
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ComputeRouter,
    routeJob: 'routeJob', // For SwarmRegistry to call
    getCurrentRouting: 'getCurrentRouting',
    getCircuitBreakerStatus: 'getCircuitBreakerStatus'
  };
}

// Browser global for direct use
if (typeof window !== 'undefined') {
  window.ComputeRouter = ComputeRouter;
  window.routeJob = 'routeJob';
  window.getCurrentRouting = 'getCurrentRouting';
  window.getCircuitBreakerStatus = 'getCircuitBreakerStatus';
  console.log('[ComputeRouter] Loaded in browser');
}
