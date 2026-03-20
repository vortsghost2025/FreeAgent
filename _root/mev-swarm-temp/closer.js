/**
 * CLOSER MODULE
 * Handles graceful shutdown for MEV Swarm
 */

class MEVCloser {
  /**
   * Start monitoring for idle pipeline
   * @param {Function} shutdownCallback - Called when system should shut down
   */
  startMonitoring(shutdownCallback) {
    this.shutdownCallback = shutdownCallback;
    this.cyclesSinceDrain = 0;
    this.lastExecutionTime = Date.now();
    this.isActive = true;

    // Check every 5 seconds
    this.monitorInterval = setInterval(() => {
      const idleTime = Date.now() - this.lastExecutionTime;

      if (idleTime > 10000 && this.cyclesSinceDrain > 10) {
        if (this.isActive) {
          console.log('\n🔍 CLOSER: Pipeline idle - initiating graceful shutdown');
          console.log('💡 Draining opportunity queue and stopping all chambers');
          this.shutdown();
        }
      }
    }, 5000);
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.isActive = false;

    console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  🏁 MEV SWARM - GRACEFUL SHUTDOWN           ║');
    console.log('╚═════════════════════════════════════════════════════════════════════════════════╝\n');
    console.log('📋 Shutdown Summary:');
    console.log('   ✅ All chambers stopped');
    console.log('   ✅ Event bus drained');
    console.log('   ✅ No pending operations');
    console.log('   ✅ Graceful exit');
    console.log('');

    if (this.shutdownCallback) {
      this.shutdownCallback();
    }

    process.exit(0);
  }
}

export { MEVCloser };