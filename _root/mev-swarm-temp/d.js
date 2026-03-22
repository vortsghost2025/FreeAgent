const ExecutionStyle = { DEFER: 'defer', BACKRUN: 'backrun', FRONTRUN: 'frontrun' };  
const AggressionLevel = { LOW: 'low', MODERATE: 'moderate', HIGH: 'high' };  
const DEFAULTS = { MIN_CONFIDENCE_TO_ACT: 0.5, HIGH_CONFIDENCE: 0.8, MIN_SCORE_TO_ACT: 40, HIGH_SCORE: 80, MIN_PROFIT: 0.01, HIGH_PROFIT: 0.05, MAX_GAS_FOR_ACTION: 100, HIGH_GAS: 50, INITIAL_TRADE_SIZE: 0.1, MAX_TRADE_SIZE: 1.0, TRADE_SIZE_INCREMENT: 0.1, FAILURE_COOLDOWN: 30, CONFIDENCE_GAIN_ON_SUCCESS: 0.05, CONFIDENCE_LOSS_ON_FAILURE: 0.1, CONFIDENCE_DECAY: 0.01, LOW_AGGRESSION: 0.5, MODERATE_AGGRESSION: 0.75 }; 
class DecisionEngine {  
constructor(options = {}) {  
this.config = { ...DEFAULTS, ...options };  
this.confidence = 0.5;  
this.cooldownUntil = 0;  
this.recentFailures = 0;  
this.currentTradeSize = this.config.INITIAL_TRADE_SIZE;  
console.log('[DecisionEngine] Initialized');  
} 
