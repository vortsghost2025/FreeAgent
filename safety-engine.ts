// USS ChaosBringer — SafetyEngine v1.0 Skeleton
// This module implements the core safety/risk logic for the event-driven control plane.
// It evaluates SafetyRules, aggregates actions, determines severity, and produces the safetyDecision for EventResult.

import { EventType, EventResult, SafetyDecision, ShipMode, ThreatLevel } from './bridge-control';

// --- SafetyRule Interface ---
export interface SafetyRule {
  name: string;
  description: string;
  appliesTo: (eventType: EventType, mode: ShipMode) => boolean;
  evaluate: (params: SafetyEvaluationParams) => SafetyRuleResult;
}

// --- SafetyAction Type ---
export type SafetyAction = {
  type: string; // e.g. 'HALT', 'ALERT', 'CLAMP', 'LOG_ONLY'
  message: string;
  severity: number; // 0 = info, 1 = warning, 2 = alert, 3 = critical
  meta?: any;
};

// --- SafetyRuleResult Type ---
export type SafetyRuleResult = {
  triggered: boolean;
  actions: SafetyAction[];
  severity: number;
  modeChange?: ShipMode;
  threatLevel?: ThreatLevel;
};

// --- SafetyEngine Interface ---
export interface SafetyEngine {
  /**
   * Evaluates all relevant safety rules for a given event and state.
   * Returns a SafetyDecision for EventResult.
   */
  evaluate(params: SafetyEvaluationParams): SafetyDecision;
}

// --- Evaluation Params ---
export interface SafetyEvaluationParams {
  eventType: EventType;
  eventData: any;
  currentState: any;
  currentMode: ShipMode;
  currentThreat: ThreatLevel;
  // Optionally: auditChain, context, etc.
}

// --- SafetyDecision Shape ---
export interface SafetyDecision {
  actions: SafetyAction[];           // All triggered safety actions (ordered by severity)
  highestSeverity: number;           // Highest severity encountered (0 = none)
  triggeredRules: SafetyRule[];      // All rules that fired
  modeChange?: ShipMode;             // If a mode change is triggered
  threatLevel: ThreatLevel;          // Updated threat level
  summary: string;                   // Human-readable summary
  // Optionally: audit metadata, timestamps, etc.
}

// --- SafetyRule Registry ---
export const DefaultSafetyRules: SafetyRule[] = [
  {
    name: 'NoMissingData',
    description: 'No workflow continues with missing or stale data.',
    appliesTo: (eventType, mode) => true,
    evaluate: (params) => {
      if (!params.eventData || params.eventData.missing) {
        return {
          triggered: true,
          actions: [{
            type: 'HALT',
            message: 'Missing or stale data detected. Halting workflow.',
            severity: 3
          }],
          severity: 3,
          modeChange: 'SAFE_MODE',
          threatLevel: 'CRITICAL'
        };
      }
      return { triggered: false, actions: [], severity: 0 };
    }
  },
  {
    name: 'BearishRegimeHalt',
    description: 'Bearish or undefined regimes halt execution.',
    appliesTo: (eventType, mode) => true,
    evaluate: (params) => {
      if (params.currentState && params.currentState.regime && ['BEARISH', 'UNDEFINED'].includes(params.currentState.regime)) {
        return {
          triggered: true,
          actions: [{
            type: 'HALT',
            message: 'Bearish or undefined regime. Halting execution.',
            severity: 3
          }],
          severity: 3,
          modeChange: 'SAFE_MODE',
          threatLevel: 'CRITICAL'
        };
      }
      return { triggered: false, actions: [], severity: 0 };
    }
  },
  {
    name: 'RiskVeto',
    description: 'Risk veto always overrides signals.',
    appliesTo: (eventType, mode) => true,
    evaluate: (params) => {
      if (params.currentState && params.currentState.riskVeto) {
        return {
          triggered: true,
          actions: [{
            type: 'HALT',
            message: 'Risk veto active. Halting execution.',
            severity: 3
          }],
          severity: 3,
          modeChange: 'SAFE_MODE',
          threatLevel: 'CRITICAL'
        };
      }
      return { triggered: false, actions: [], severity: 0 };
    }
  },
  {
    name: 'PaperModeDefault',
    description: 'Paper mode is default. Live mode requires manual activation.',
    appliesTo: (eventType, mode) => eventType === 'EXECUTION',
    evaluate: (params) => {
      if (params.currentMode !== 'PAPER' && !params.currentState.liveModeActivated) {
        return {
          triggered: true,
          actions: [{
            type: 'CLAMP',
            message: 'Live mode not manually activated. Forcing paper mode.',
            severity: 2
          }],
          severity: 2,
          modeChange: 'PAPER',
          threatLevel: 'ELEVATED'
        };
      }
      return { triggered: false, actions: [], severity: 0 };
    }
  },
  {
    name: 'StructuralIntegrity',
    description: 'Agents cannot modify global state. Orchestrator validates all messages.',
    appliesTo: (eventType, mode) => true,
    evaluate: (params) => {
      if (params.eventData && params.eventData.unauthorizedGlobalWrite) {
        return {
          triggered: true,
          actions: [{
            type: 'HALT',
            message: 'Unauthorized global state modification detected.',
            severity: 3
          }],
          severity: 3,
          modeChange: 'SAFE_MODE',
          threatLevel: 'CRITICAL'
        };
      }
      return { triggered: false, actions: [], severity: 0 };
    }
  }
];

// --- SafetyEngine Implementation ---
export class DefaultSafetyEngine implements SafetyEngine {
  private rules: SafetyRule[];

  constructor(rules: SafetyRule[] = DefaultSafetyRules) {
    this.rules = rules;
  }

  evaluate(params: SafetyEvaluationParams): SafetyDecision {
    const triggeredRules: SafetyRule[] = [];
    const actions: SafetyAction[] = [];
    let highestSeverity = 0;
    let modeChange: ShipMode | undefined = undefined;
    let threatLevel = params.currentThreat;

    // Evaluate all rules
    for (const rule of this.rules) {
      if (rule.appliesTo(params.eventType, params.currentMode)) {
        const result = rule.evaluate(params);
        if (result.triggered) {
          triggeredRules.push(rule);
          actions.push(...result.actions);
          if (result.severity > highestSeverity) highestSeverity = result.severity;
          if (result.modeChange) modeChange = result.modeChange;
          if (result.threatLevel !== undefined) threatLevel = result.threatLevel;
        }
      }
    }

    // Order actions by severity descending
    actions.sort((a, b) => b.severity - a.severity);

    // Compose summary
    const summary = triggeredRules.length
      ? `Triggered ${triggeredRules.length} safety rule(s): ${triggeredRules.map(r => r.name).join(', ')}`
      : 'No safety rules triggered.';

    return {
      actions,
      highestSeverity,
      triggeredRules,
      modeChange,
      threatLevel,
      summary
    };
  }
}

// --- Integration Point: BridgeControl/EventResult ---
// BridgeControl should call SafetyEngine.evaluate() during event processing and include the SafetyDecision in EventResult.

// --- End SafetyEngine v1.0 Skeleton ---
