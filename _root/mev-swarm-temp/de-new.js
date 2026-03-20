const ExecutionStyle = { DEFER: "defer", BACKRUN: "backrun", FRONTRUN: "frontrun" };  
const AggressionLevel = { LOW: "low", MODERATE: "moderate", HIGH: "high" };  
class DecisionEngine {  
constructor(options = {}) {  
this.config = { MIN_CONFIDENCE_TO_ACT: 0.5, HIGH_CONFIDENCE: 0.8, MIN_SCORE_TO_ACT: 40, MIN_PROFIT: 0.01, INITIAL_TRADE_SIZE: 0.1, MAX_TRADE_SIZE: 1.0, FAILURE_COOLDOWN: 30, CONFIDENCE_GAIN: 0.05, CONFIDENCE_LOSS: 0.1, CONFIDENCE_DECAY: 0.01, ...options };  
this.confidence = 0.5;  
this.cooldownUntil = 0;  
this.recentFailures = 0;  
this.tradeSize = this.config.INITIAL_TRADE_SIZE;  
console.log("[DecisionEngine] Initialized");  
} 
isInCooldown() {  
