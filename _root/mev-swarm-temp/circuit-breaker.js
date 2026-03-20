import { SAFETY_CONFIG } from './safety-config.js';

export class CircuitBreaker {
  constructor() {
    this.consecutiveFailures = 0;
    this.dailyLoss = 0n;
    this.tripped = false;
  }

  recordResult(success, loss = 0n) {
    if (!success) {
      this.consecutiveFailures += 1;
      this.dailyLoss += loss;

      if (this.consecutiveFailures >= 5 || this.dailyLoss > SAFETY_CONFIG.maxDailyExposure) {
        this.tripped = true;
        console.warn('🛑 CIRCUIT BREAKER TRIPPED', { consecutiveFailures: this.consecutiveFailures, dailyLoss: this.dailyLoss.toString() });
      }
      return;
    }

    this.consecutiveFailures = 0;
  }

  reset() {
    this.consecutiveFailures = 0;
    this.dailyLoss = 0n;
    this.tripped = false;
  }
}
