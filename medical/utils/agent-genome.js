/**
 * Agent Genome - The Temperament Layer
 * 
 * Defines agent personalities that shape reasoning:
 * - Kilo = deterministic, architectural, structured
 * - Lingam = associative, exploratory, creative
 * - Clinical = cautious, rule-driven
 * - Code = literal, precise
 * 
 * Creates diversity of thought, which improves fusion.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Agent Genomes
 */
const GENOMES = {
    kilo: {
        name: 'Kilo',
        traits: ['deterministic', 'architectural', 'structured', 'detailed'],
        strengths: ['system_design', 'code_quality', 'best_practices'],
        weaknesses: ['creative_block', 'over_engineering'],
        reasoningStyle: 'step_by_step',
        outputFormat: 'structured_markdown',
        confidenceBias: 0.9
    },

    lingam: {
        name: 'Lingam',
        traits: ['exploratory', 'associative', 'creative'],
        strengths: ['novel_solutions', 'pattern_recognition', 'creative_thinking'],
        weaknesses: ['structure', 'consistency'],
        reasoningStyle: 'divergent',
        outputFormat: 'narrative',
        confidenceBias: 0.8
    },

    clinical: {
        name: 'Clinical',
        traits: ['cautious', 'rule_driven', 'literal', 'detailed'],
        strengths: ['safety', 'compliance', 'risk_assessment'],
        weaknesses: ['speed', 'flexibility'],
        reasoningStyle: 'evidence_based',
        outputFormat: 'clinical_report',
        confidenceBias: 0.7
    },

    code: {
        name: 'Code',
        traits: ['literal', 'deterministic', 'concise'],
        strengths: ['syntax', 'performance', 'testing'],
        weaknesses: ['abstraction', 'high_level_design'],
        reasoningStyle: 'exact',
        outputFormat: 'code_blocks',
        confidenceBias: 0.95
    },

    security: {
        name: 'Security',
        traits: ['cautious', 'literal', 'detailed'],
        strengths: ['threat_modeling', 'vulnerability_detection'],
        weaknesses: ['usability', 'convenience'],
        reasoningStyle: 'worst_case',
        outputFormat: 'security_report',
        confidenceBias: 0.75
    }
};

/**
 * Agent Genome Editor
 */
export class AgentGenomeEditor {
    constructor() {
        this.customGenomes = new Map();
    }

    /**
     * Get genome for agent
     */
    getGenome(agentId) {
        return GENOMES[agentId] || this.customGenomes.get(agentId) || null;
    }

    /**
     * Create custom genome
     */
    createGenome(agentId, config) {
        const genome = {
            name: config.name || agentId,
            traits: config.traits || [],
            strengths: config.strengths || [],
            weaknesses: config.weaknesses || [],
            reasoningStyle: config.reasoningStyle || 'hybrid',
            outputFormat: config.outputFormat || 'standard',
            confidenceBias: config.confidenceBias || 0.8
        };

        this.customGenomes.set(agentId, genome);
        return genome;
    }

    /**
     * Modify genome (evolution)
     */
    evolveGenome(agentId, learning) {
        const genome = this.getGenome(agentId);
        if (!genome) return null;

        // Add new strengths from learning
        if (learning.newStrengths) {
            genome.strengths = [...new Set([...genome.strengths, ...learning.newStrengths])];
        }

        // Remove weaknesses that are resolved
        if (learning.resolvedWeaknesses) {
            genome.weaknesses = genome.weaknesses.filter(
                w => !learning.resolvedWeaknesses.includes(w)
            );
        }

        // Adjust confidence bias
        if (learning.confidenceAdjustment) {
            genome.confidenceBias = Math.min(1, Math.max(0.5,
                genome.confidenceBias + learning.confidenceAdjustment
            ));
        }

        return genome;
    }

    /**
     * Get traits for fusion weighting
     */
    getFusionTraits(agentId1, agentId2) {
        const g1 = this.getGenome(agentId1);
        const g2 = this.getGenome(agentId2);

        if (!g1 || !g2) return {};

        return {
            agent1: {
                traits: g1.traits,
                reasoningStyle: g1.reasoningStyle,
                confidenceBias: g1.confidenceBias
            },
            agent2: {
                traits: g2.traits,
                reasoningStyle: g2.reasoningStyle,
                confidenceBias: g2.confidenceBias
            },
            diversity: this.calculateDiversity(g1, g2)
        };
    }

    /**
     * Calculate diversity between genomes
     */
    calculateDiversity(g1, g2) {
        const sharedTraits = g1.traits.filter(t => g2.traits.includes(t));
        return 1 - (sharedTraits.length / Math.max(g1.traits.length, g2.traits.length));
    }

    /**
     * List all available genomes
     */
    listGenomes() {
        return {
            builtIn: Object.keys(GENOMES),
            custom: Array.from(this.customGenomes.keys())
        };
    }
}

export default AgentGenomeEditor;