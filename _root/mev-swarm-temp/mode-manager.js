/**
 * 🐚 Mode Manager - MEV Organism Behavioral Shell
 * Multi-mode operation system with distinct behavioral patterns
 */

class ModeManager {
  constructor(config = {}) {
    this.currentMode = config.initialMode || 'economic';
    this.modes = new Map();
    this.initialSubMode = config.initialSubMode || 'aggressive'; // Default to penny hunting
    this.modeTransitions = [];
    this.modeConstraints = new Map();
    this.subModeChangeCallbacks = []; // Store callbacks for sub-mode changes
    
    // Initialize core modes
    this.initializeModes();
    this.setupConstraints();
    
    // Apply initial sub-mode (penny hunting by default)
    if (this.initialSubMode && this.initialSubMode !== 'normal') {
      this.setEconomicSubMode(this.initialSubMode);
    }
  }

  initializeModes() {
    // Economic Engine Mode - Profit maximization with sub-modes
    this.modes.set('economic', {
      name: 'Economic Engine',
      description: 'Aggressive profit-seeking with capital allocation',
      riskProfile: 'high',
      capitalAllocation: 1.0, // 100% available capital
      economicSubMode: 'normal', // conservative | normal | aggressive
      strategyWeights: {
        arbitrage: 0.4,
        liquidation: 0.3,
        sandwich: 0.2,
        crossChain: 0.1
      },
      riskLimits: {
        maxDrawdown: 0.15, // 15% maximum drawdown
        positionSize: 0.1, // 10% per position
        dailyLossLimit: 0.05 // 5% daily loss cap
      },
      economicParameters: {
        conservative: { 
          risk: 0.9, 
          filter: 0.85, 
          explore: 0.1,
          minProfitThreshold: 0.001,
          taskFiltering: 'strict'
        },
        normal: { 
          risk: 0.6, 
          filter: 0.55, 
          explore: 0.3,
          minProfitThreshold: 0.0005,
          taskFiltering: 'balanced'
        },
        aggressive: { 
          risk: 0.3, 
          filter: 0.25, 
          explore: 0.7,
          minProfitThreshold: 0.0001,
          taskFiltering: 'loose'
        }
      },
      logging: {
        level: 'info',
        metrics: ['profit', 'drawdown', 'sharpe'],
        alerts: ['loss_limit', 'drawdown_exceeded']
      }
    });

    // Research Lab Mode - Safe exploration and discovery
    this.modes.set('research', {
      name: 'Research Lab',
      description: 'Simulation-only mode for market analysis',
      riskProfile: 'none',
      capitalAllocation: 0.0, // No real capital
      strategyWeights: {
        arbitrage: 0.3,
        liquidation: 0.3,
        sandwich: 0.2,
        crossChain: 0.2
      },
      riskLimits: {
        maxDrawdown: 0.0, // No risk
        positionSize: 0.0,
        dailyLossLimit: 0.0
      },
      logging: {
        level: 'debug',
        metrics: ['edge_discovery', 'regime_detection', 'pattern_analysis'],
        alerts: ['anomaly_detected', 'opportunity_identified']
      }
    });

    // Autonomous Co-Trader Mode - Explainable AI assistance
    this.modes.set('cotrader', {
      name: 'Autonomous Co-Trader',
      description: 'Human-aligned trading with explanations',
      riskProfile: 'medium',
      capitalAllocation: 0.5, // 50% capital
      strategyWeights: {
        arbitrage: 0.35,
        liquidation: 0.25,
        sandwich: 0.2,
        crossChain: 0.2
      },
      riskLimits: {
        maxDrawdown: 0.08, // 8% maximum drawdown
        positionSize: 0.05, // 5% per position
        dailyLossLimit: 0.03 // 3% daily loss cap
      },
      logging: {
        level: 'verbose',
        metrics: ['intent_alignment', 'explanation_quality', 'human_feedback'],
        alerts: ['confidence_low', 'human_override_required', 'ethical_boundary']
      }
    });

    console.log('🐚 Mode Manager initialized with 3 operational modes');
  }

  setupConstraints() {
    // Define mode transition rules
    this.modeConstraints.set('economic->research', {
      condition: (context) => context.drawdown > 0.1,
      cooldown: 300000, // 5 minutes
      priority: 'high'
    });

    this.modeConstraints.set('research->economic', {
      condition: (context) => context.confidence_score > 0.8,
      cooldown: 600000, // 10 minutes
      priority: 'medium'
    });

    this.modeConstraints.set('economic->cotrader', {
      condition: (context) => context.volatility > 2.0,
      cooldown: 120000, // 2 minutes
      priority: 'high'
    });

    // Auto-transition rules based on performance
    this.autoTransitionRules = [
      {
        name: 'drawdown_protection',
        from: 'economic',
        to: 'cotrader',
        condition: (metrics) => metrics.drawdown > 0.12,
        action: 'protect_capital'
      },
      {
        name: 'profit_maximization',
        from: 'cotrader',
        to: 'economic',
        condition: (metrics) => metrics.success_rate > 0.7 && metrics.drawdown < 0.05,
        action: 'increase_aggression'
      },
      {
        name: 'market_turbulence',
        from: 'economic',
        to: 'research',
        condition: (metrics) => metrics.volatility > 2.5,
        action: 'pause_trading'
      }
    ];
  }

  async switchMode(newMode, context = {}) {
    if (!this.modes.has(newMode)) {
      throw new Error(`Invalid mode: ${newMode}. Available modes: ${Array.from(this.modes.keys()).join(', ')}`);
    }

    if (this.currentMode === newMode) {
      console.log(`🔄 Already in ${newMode} mode`);
      return false;
    }

    const oldMode = this.currentMode;
    const transitionKey = `${oldMode}->${newMode}`;
    
    // Check transition constraints
    if (this.modeConstraints.has(transitionKey)) {
      const constraint = this.modeConstraints.get(transitionKey);
      if (!constraint.condition(context)) {
        console.log(`🚫 Transition from ${oldMode} to ${newMode} blocked by constraints`);
        return false;
      }
    }

    // Record transition
    this.modeTransitions.push({
      from: oldMode,
      to: newMode,
      timestamp: Date.now(),
      context,
      reason: context.reason || 'manual_switch'
    });

    this.currentMode = newMode;
    
    console.log(`🔄 Mode switched: ${oldMode} → ${newMode}`);
    console.log(`📊 New mode configuration:`, this.getCurrentModeConfig());
    
    // Emit mode change event
    this.emitModeChangeEvent(oldMode, newMode, context);
    
    return true;
  }

  getCurrentModeConfig() {
    return this.modes.get(this.currentMode);
  }

  getModeByName(modeName) {
    return this.modes.get(modeName);
  }

  getAllModes() {
    return Array.from(this.modes.entries()).map(([name, config]) => ({
      name,
      ...config
    }));
  }

  evaluateAutoTransitions(currentMetrics) {
    for (const rule of this.autoTransitionRules) {
      if (rule.from !== this.currentMode) continue;
      
      if (rule.condition(currentMetrics)) {
        console.log(`🤖 Auto-transition triggered: ${rule.name}`);
        this.switchMode(rule.to, {
          reason: `auto_${rule.action}`,
          metrics: currentMetrics
        });
        return true;
      }
    }
    return false;
  }

  getStrategyWeights() {
    const modeConfig = this.getCurrentModeConfig();
    return modeConfig.strategyWeights;
  }

  getRiskLimits() {
    const modeConfig = this.getCurrentModeConfig();
    return modeConfig.riskLimits;
  }

  getCapitalAllocation() {
    const modeConfig = this.getCurrentModeConfig();
    return modeConfig.capitalAllocation;
  }

  shouldExecuteStrategy(strategyName, context = {}) {
    const modeConfig = this.getCurrentModeConfig();
    
    // Check research mode restrictions
    if (this.currentMode === 'research') {
      return false; // No real execution in research mode
    }
    
    // Check capital allocation
    if (modeConfig.capitalAllocation <= 0) {
      return false;
    }
    
    // Check risk limits
    const riskLimits = modeConfig.riskLimits;
    if (context.drawdown && context.drawdown > riskLimits.maxDrawdown) {
      return false;
    }
    
    if (context.positionSize && context.positionSize > riskLimits.positionSize) {
      return false;
    }
    
    return true;
  }

  getLoggingConfig() {
    const modeConfig = this.getCurrentModeConfig();
    return modeConfig.logging;
  }

  getTransitionHistory(limit = 10) {
    return this.modeTransitions.slice(-limit).reverse();
  }

  getModeMetrics() {
    const currentConfig = this.getCurrentModeConfig();
    
    return {
      currentMode: this.currentMode,
      modeName: currentConfig.name,
      riskProfile: currentConfig.riskProfile,
      capitalAllocation: currentConfig.capitalAllocation,
      activeSince: this.modeTransitions.length > 0 
        ? this.modeTransitions[this.modeTransitions.length - 1].timestamp 
        : Date.now(),
      totalTransitions: this.modeTransitions.length,
      recentTransitions: this.getTransitionHistory(5)
    };
  }

  emitModeChangeEvent(from, to, context) {
    // In a real implementation, this would emit events to other system components
    console.log(`📢 Mode change event: ${from} → ${to}`, {
      context,
      timestamp: Date.now()
    });
  }

  // Emergency mode switching
  emergencyPause() {
    console.log('🚨 EMERGENCY PAUSE ACTIVATED');
    return this.switchMode('research', { reason: 'emergency_pause' });
  }

  // Economic sub-mode switching (architecturally clean)
  setEconomicSubMode(subMode) {
    if (this.currentMode !== 'economic') {
      console.log(`⚠️ Cannot set economic sub-mode while in ${this.currentMode} mode`);
      return false;
    }
    
    const validSubModes = ['conservative', 'normal', 'aggressive'];
    if (!validSubModes.includes(subMode)) {
      console.log(`⚠️ Invalid economic sub-mode: ${subMode}`);
      return false;
    }
    
    const currentConfig = this.modes.get('economic');
    const oldSubMode = currentConfig.economicSubMode;
    
    if (oldSubMode === subMode) {
      console.log(`🔄 Already in economic ${subMode} sub-mode`);
      return true;
    }
    
    // Apply the sub-mode parameters
    const params = currentConfig.economicParameters[subMode];
    currentConfig.economicSubMode = subMode;
    
    console.log(`🔄 Economic sub-mode switched: ${oldSubMode} → ${subMode}`);
    console.log(`📊 New parameters: risk=${params.risk}, filter=${params.filter}, explore=${params.explore}`);
    console.log(`💰 Penny threshold: ${params.minProfitThreshold} ETH`);
    
    // Emit event for worker updates
    for (const callback of this.subModeChangeCallbacks) {
      callback(subMode, params);
    }
    
    return true;
  }

  // Register callback for sub-mode changes
  onSubModeChange(callback) {
    this.subModeChangeCallbacks.push(callback);
    
    // If we're already in economic mode, trigger the callback immediately
    if (this.currentMode === 'economic') {
      const currentConfig = this.modes.get('economic');
      const params = currentConfig.economicParameters[currentConfig.economicSubMode];
      callback(currentConfig.economicSubMode, params);
    }
  }
  
  getEconomicParameters() {
    if (this.currentMode !== 'economic') {
      return null;
    }
    
    const config = this.modes.get('economic');
    return config.economicParameters[config.economicSubMode];
  }
  
  isPennyHuntingMode() {
    if (this.currentMode !== 'economic') return false;
    const config = this.modes.get('economic');
    return config.economicSubMode === 'aggressive';
  }
}

export default ModeManager;