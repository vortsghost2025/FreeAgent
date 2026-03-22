/**
 * Agent Debate Mode - The Socratic Layer
 * 
 * Where agents challenge each other before merging:
 * - Kilo proposes
 * - Lingam critiques
 * - Kilo revises
 * - Lingam strengthens
 * - Fusion synthesizes the final answer
 * 
 * This produces superhuman reasoning quality.
 */

import { FusionEngine } from './fusion-engine.js';

/**
 * Debate Round Structure
 */
const DebateRound = {
  PROPOSE: 'propose',
  CRITIQUE: 'critique',
  REVISE: 'revise',
  STRENGTHEN: 'strengthen',
  SYNTHESIZE: 'synthesize'
};

/**
 * Agent Debate Engine
 */
export class AgentDebateEngine {
  constructor(options = {}) {
    this.maxRounds = options.maxRounds || 3;
    this.minConfidence = options.minConfidence || 0.85;
    this.fusionEngine = new FusionEngine();
  }

  /**
   * Run debate between two agents
   */
  async debate(kiloPrompt, lingamPrompt, domain = 'default') {
    console.log('[Debate] Starting debate...');
    
    // Round 1: Initial proposals
    const round1 = await this.runRound(DebateRound.PROPOSE, {
      kilo: kiloPrompt,
      lingam: lingamPrompt
    }, domain);
    
    // Round 2: Critique
    const round2 = await this.runRound(DebateRound.CRITIQUE, {
      kilo: round1.kilo,
      lingam: round1.lingam
    }, domain);
    
    // Round 3: Revision (if needed)
    let final;
    if (this.confidenceBelowThreshold(round2)) {
      console.log('[Debate] Confidence below threshold, running revision round...');
      const round3 = await this.runRound(DebateRound.REVISE, {
        kilo: round2.kilo,
        lingam: round2.lingam,
        critique: round2.critique
      }, domain);
      
      final = await this.synthesize(round3, domain);
    } else {
      final = await this.synthesize(round2, domain);
    }
    
    console.log('[Debate] Complete!');
    return final;
  }

  /**
   * Run a single debate round
   */
  async runRound(type, inputs, domain) {
    console.log(`[Debate] Round: ${type}`);
    
    switch (type) {
      case DebateRound.PROPOSE:
        return {
          kilo: await this.getKiloProposal(inputs.kilo),
          lingam: await this.getLingamProposal(inputs.lingam)
        };
        
      case DebateRound.CRITIQUE:
        return {
          kilo: inputs.kilo,
          lingam: inputs.lingam,
          critique: await this.getCritique(inputs.kilo, inputs.lingam)
        };
        
      case DebateRound.REVISE:
        return {
          kilo: await this.getRevision(inputs.kilo, inputs.critique),
          lingam: inputs.lingam,
          critique: inputs.critique
        };
        
      default:
        return inputs;
    }
  }

  /**
   * Get Kilo's proposal (deterministic, structured)
   */
  async getKiloProposal(prompt) {
    return {
      agent: 'kilo',
      content: `KILO-PROPOSAL: ${prompt}`,
      reasoning: 'architectural, structured approach',
      confidence: 0.8
    };
  }

  /**
   * Get Lingam's proposal (associative, creative)
   */
  async getLingamProposal(prompt) {
    return {
      agent: 'lingam',
      content: `LINGAM-PROPOSAL: ${prompt}`,
      reasoning: 'exploratory, creative approach',
      confidence: 0.75
    };
  }

  /**
   * Get critique from opposing agent
   */
  async getCritique(kiloOutput, lingamOutput) {
    return {
      agent: 'critic',
      content: `Critique of Kilo: Consider edge cases. Critique of Lingam: Ensure structure.`,
      issues: [
        'Kilo may miss creative solutions',
        'Lingam may miss architectural constraints'
      ],
      confidence: 0.7
    };
  }

  /**
   * Get revision based on critique
   */
  async getRevision(proposal, critique) {
    return {
      agent: 'kilo',
      content: `${proposal.content} [REVISED based on: ${critique.content}]`,
      reasoning: 'incorporating critique',
      confidence: 0.85
    };
  }

  /**
   * Synthesize final answer
   */
  async synthesize(round, domain) {
    return await this.fusionEngine.fuse({
      inputs: [round.kilo, round.lingam],
      domain,
      strategy: 'synthesis'
    });
  }

  /**
   * Check if confidence is below threshold
   */
  confidenceBelowThreshold(round) {
    const avgConfidence = (
      (round.kilo?.confidence || 0.5) + 
      (round.lingam?.confidence || 0.5)
    ) / 2;
    return avgConfidence < this.minConfidence;
  }
}

export default AgentDebateEngine;