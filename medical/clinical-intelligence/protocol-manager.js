/**
 * Protocol Manager
 * Unified orchestrator for both Protocol Activator v2 (5 emergency) and Extended (5 critical)
 * Total 10 emergency protocols with intelligent conflict resolution
 */

import { ProtocolActivatorV2 } from './protocol-activator-v2.js';
import { ProtocolActivatorExtended } from './protocol-activator-extended.js';

export class ProtocolManager {
  constructor(standards = {}, options = {}) {
    this.standards = standards;
    this.debug = options.debug || false;
    this.protocolActivatorV2 = new ProtocolActivatorV2(standards, { debug: options.debug });
    this.protocolActivatorExtended = new ProtocolActivatorExtended(standards, { debug: options.debug });

    if (this.debug) console.log('[ProtocolManager] Initialized with 10 emergency protocols');
  }

  /**
   * Comprehensive protocol evaluation across all 10 protocols
   * Returns ranked list with conflict resolution
   */
  evaluateAllProtocols(patientData) {
    const startTime = performance.now();

    // Evaluate both protocol suites
    const resultV2 = this.protocolActivatorV2.evaluateProtocolActivation(patientData);
    const resultExt = this.protocolActivatorExtended.evaluateProtocolActivation(patientData);

    // Merge results
    const allActivated = [
      ...resultV2.activatedProtocols,
      ...resultExt.activatedProtocols
    ];

    // Sort by score descending
    allActivated.sort((a, b) => b.score - a.score);

    // Conflict resolution: detect competing protocols
    const primaryProtocol = allActivated[0] || null;
    const competingProtocols = this.detectCompetingProtocols(allActivated);

    const elapsed = performance.now() - startTime;

    return {
      activatedProtocols: allActivated,
      primaryProtocol,
      competingProtocols,
      allScoresV2: resultV2.allScores,
      allScoresExtended: resultExt.allScores,
      totalProtocolsEvaluated: Object.keys(resultV2.allScores).length + Object.keys(resultExt.allScores).length,
      totalProtocolsActivated: allActivated.length,
      processingTime: elapsed
    };
  }

  /**
   * Detect protocols that might compete with each other
   * Key conflicts:
   * - ACS family: Chest pain → Differential between ACS, STEMI, Anaphylaxis
   * - Shock family: Hypotension → Septic shock, Cardiogenic shock, Anaphylactic shock
   * - Seizure family: Seizures → Status Epilepticus, Eclampsia with seizure
   */
  detectCompetingProtocols(activatedProtocols) {
    const competing = [];

    const acsFamily = ['Acute Coronary Syndrome (ACS)', 'STEMI Protocol', 'Anaphylaxis Protocol'];
    const shockFamily = ['Sepsis Protocol', 'Anaphylaxis Protocol', 'Obstetric Emergency Protocol'];
    const seizureFamily = ['Status Epilepticus Protocol', 'Obstetric Emergency Protocol', 'Severe Hypoglycemia Protocol'];
    const strokeFamily = ['Acute Stroke Protocol', 'Status Epilepticus Protocol'];

    const activatedNames = activatedProtocols.map(p => p.protocol);

    // Check each family for multiple activations
    [acsFamily, shockFamily, seizureFamily, strokeFamily].forEach(family => {
      const overlap = family.filter(name => activatedNames.includes(name));
      if (overlap.length > 1) {
        competing.push({
          family: family[0].split(' ')[0], // Category name
          protocols: overlap,
          recommendation: this.getConflictResolution(overlap)
        });
      }
    });

    return competing;
  }

  /**
   * Get clinical recommendation for protocol conflicts
   */
  getConflictResolution(protocols) {
    // STEMI > ACS > Anaphylaxis (STEMI is most specific)
    if (protocols.includes('STEMI Protocol')) return 'STEMI Protocol takes priority - requires emergent catheterization';
    if (protocols.includes('Anaphylaxis Protocol')) return 'Confirm anaphylaxis with clinical presentation; STEMI symptoms can mimic anaphylaxis';

    // Status Epilepticus > Eclampsia-seizure
    if (protocols.includes('Status Epilepticus Protocol') && protocols.includes('Obstetric Emergency Protocol')) {
      return 'Confirm pregnancy status; if pregnant, eclampsia takes precedence; otherwise treat as primary seizure disorder';
    }

    // Acute Stroke > Status Epilepticus (stroke mimics seizure)
    if (protocols.includes('Acute Stroke Protocol') && protocols.includes('Status Epilepticus Protocol')) {
      return 'Stroke commonly mimics seizures; confirm with imaging and neurological exam';
    }

    // Sepsis > other shock states
    if (protocols.includes('Sepsis Protocol')) return 'Sepsis resuscitation is standard; adjust for cardiogenic vs anaphylactic components';

    return 'Manage primary protocol; monitor for secondary conditions';
  }

  /**
   * Get consolidated summary across all protocols
   */
  getConsolidatedSummary(evaluationResult) {
    const lines = [];

    lines.push(`\n${'═'.repeat(70)}`);
    lines.push(`PROTOCOL MANAGER: 10-PROTOCOL COMPREHENSIVE EVALUATION`);
    lines.push(`${'═'.repeat(70)}\n`);

    lines.push(`Total Protocols Evaluated: ${evaluationResult.totalProtocolsEvaluated}`);
    lines.push(`Total Protocols Activated: ${evaluationResult.totalProtocolsActivated}`);
    lines.push(`Processing Time: ${evaluationResult.processingTime.toFixed(2)}ms\n`);

    if (evaluationResult.primaryProtocol) {
      lines.push(`🎯 PRIMARY PROTOCOL: ${evaluationResult.primaryProtocol.protocol}`);
      lines.push(`   Priority: ${evaluationResult.primaryProtocol.priority}`);
      lines.push(`   Score: ${evaluationResult.primaryProtocol.score.toFixed(1)}/100`);
      lines.push(`   Immediate Actions: ${evaluationResult.primaryProtocol.immediateActions.length}`);
    }

    if (evaluationResult.activatedProtocols.length > 1) {
      lines.push(`\n🚨 ALL ACTIVATED PROTOCOLS (${evaluationResult.activatedProtocols.length}):`);
      evaluationResult.activatedProtocols.forEach((proto, i) => {
        lines.push(`   ${i + 1}. ${proto.protocol} [${proto.priority}] - Score: ${proto.score.toFixed(1)}`);
      });
    }

    if (evaluationResult.competingProtocols.length > 0) {
      lines.push(`\n⚠️  COMPETING PROTOCOLS DETECTED:`);
      evaluationResult.competingProtocols.forEach(conflict => {
        lines.push(`   ${conflict.family} Conflict:`);
        conflict.protocols.forEach(p => lines.push(`     • ${p}`));
        lines.push(`   → ${conflict.recommendation}`);
      });
    }

    lines.push(`\n${'═'.repeat(70)}\n`);

    return lines.join('\n');
  }

  /**
   * Get all available protocols with metadata
   */
  getAllProtocols() {
    const v2Protocols = Object.values(this.protocolActivatorV2.protocols).map(p => ({
      name: p.name,
      priority: p.priority,
      suite: 'v2',
      triggers: p.triggers.primary.length + p.triggers.secondary.length
    }));

    const extProtocols = Object.values(this.protocolActivatorExtended.protocols).map(p => ({
      name: p.name,
      priority: p.priority,
      suite: 'extended',
      triggers: p.triggers.primary.length + p.triggers.secondary.length
    }));

    return {
      v2: v2Protocols,
      extended: extProtocols,
      total: v2Protocols.length + extProtocols.length
    };
  }
}

export default ProtocolManager;
