/**
 * Context Distributor - Universal context distribution for all agents
 * Automatically loads and distributes knowledge from all session files
 * 
 * Usage:
 *   import { bootstrapAgent, getUniversalContext } from './utils/context-distributor.js';
 *   const context = await bootstrapAgent('new-agent-name');
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Memory directory location (relative to project root)
const MEMORY_DIR = path.join(__dirname, '..', 'agent-memory');

/**
 * Load all session files and extract key context
 */
export async function loadAllSessions() {
    try {
        const files = fs.readdirSync(MEMORY_DIR);
        const sessionFiles = files.filter(file => file.endsWith('.json'));

        const sessions = {};

        for (const fileName of sessionFiles) {
            try {
                const filePath = path.join(MEMORY_DIR, fileName);
                const content = fs.readFileSync(filePath, 'utf8');
                const sessionData = JSON.parse(content);

                const agentName = fileName.replace('.json', '');
                sessions[agentName] = sessionData;

                console.log(`[Context] Loaded session for agent: ${agentName}`);
            } catch (err) {
                console.error(`[Context] Error loading ${fileName}:`, err.message);
            }
        }

        return sessions;
    } catch (err) {
        console.error('[Context] Error loading sessions:', err.message);
        return {};
    }
}

/**
 * Extract universal context from all sessions
 */
export function extractUniversalContext(sessions) {
    const context = {
        project: {
            name: 'Medical Data Processing Module',
            version: '1.0.0',
            description: 'Production-ready, 5-agent swarm architecture for structural medical data processing'
        },
        architecture: {
            agents: [],
            pipeline: ['Ingestion', 'Triage', 'Summarization', 'Risk', 'Output'],
            classificationTypes: ['Symptoms', 'Lab Results', 'Imaging Reports', 'Vital Signs', 'Clinical Notes', 'Other']
        },
        keyDecisions: [],
        domainKnowledge: [],
        securityRequirements: []
    };

    for (const [agentName, sessionData] of Object.entries(sessions)) {
        context.architecture.agents.push(agentName);

        if (sessionData.sessions) {
            sessionData.sessions.forEach(session => {
                if (session.messages && session.messages.length > 0) {
                    const lastMessage = session.messages[session.messages.length - 1];

                    if (lastMessage.content && typeof lastMessage.content === 'string') {
                        if (lastMessage.content.toLowerCase().includes('medical') ||
                            lastMessage.content.toLowerCase().includes('clinical')) {
                            context.domainKnowledge.push({
                                agent: agentName,
                                content: lastMessage.content.substring(0, 200),
                                timestamp: session.timestamp
                            });
                        }

                        if (lastMessage.content.toLowerCase().includes('agent') ||
                            lastMessage.content.toLowerCase().includes('pipeline') ||
                            lastMessage.content.toLowerCase().includes('federation')) {
                            context.keyDecisions.push({
                                agent: agentName,
                                decision: lastMessage.content.substring(0, 200),
                                timestamp: session.timestamp
                            });
                        }
                    }
                }
            });
        }

        if (sessionData.entries) {
            sessionData.entries.forEach(entry => {
                if (entry.content) {
                    context.domainKnowledge.push({
                        agent: entry.agent || agentName,
                        content: entry.content,
                        type: entry.type,
                        timestamp: entry.timestamp
                    });
                }
            });
        }
    }

    context.securityRequirements = [
        'Use allowlist of permitted commands only',
        'Apply blocklist of dangerous patterns as secondary defense',
        'Always spawn processes with shell:false',
        'Validate input parameters before execution',
        'Limit output sizes to prevent memory issues'
    ];

    return context;
}

/**
 * Bootstrap a new agent with universal context
 */
export async function bootstrapAgent(agentName) {
    console.log(`[Context] Bootstrapping agent: ${agentName}`);

    const sessions = await loadAllSessions();
    const universalContext = extractUniversalContext(sessions);

    universalContext.currentAgent = agentName;
    universalContext.bootstrapTime = new Date().toISOString();

    console.log(`[Context] Agent ${agentName} bootstrapped with ${Object.keys(universalContext).length} context categories`);

    return universalContext;
}

/**
 * Get context for specific agent type
 */
export function getContextForAgentType(agentType) {
    const contextMap = {
        'code': { expertise: 'Code generation, refactoring, and software development', focus: ['JavaScript', 'TypeScript', 'Node.js', 'API integration'], patterns: ['Promise wrapper patterns', 'Error handling', 'Security best practices'] },
        'clinical': { expertise: 'Medical domain knowledge and clinical data processing', focus: ['Symptoms', 'Diagnosis', 'Treatment protocols', 'Patient data'], patterns: ['Structural processing only', 'No PHI inference', 'Privacy compliance'] },
        'data': { expertise: 'Data analysis and CSV/query processing', focus: ['CSV', 'JSON', 'Database queries', 'Statistical analysis'], patterns: ['Batch processing', 'Data validation', 'Error handling'] },
        'test': { expertise: 'Testing and validation', focus: ['Unit tests', 'Integration tests', 'Smoke tests', 'Coverage'], patterns: ['Controlled environment testing', 'Debounced analysis', 'Validation workflows'] },
        'security': { expertise: 'Security and vulnerability assessment', focus: ['Vulnerability scanning', 'Audit', 'Access controls', 'Encryption'], patterns: ['Allowlist/blocklist', 'Shell safety', 'Input validation'] },
        'devops': { expertise: 'CI/CD, deployment, and infrastructure automation', focus: ['Docker', 'Kubernetes', 'Cloud deployments', 'Monitoring'], patterns: ['Pipeline automation', 'Infrastructure as code', 'Zero-downtime deployments'] },
        'api': { expertise: 'API design, integration, and REST/GraphQL services', focus: ['REST APIs', 'GraphQL', 'Webhooks', 'API Gateway'], patterns: ['Rate limiting', 'Authentication', 'Versioning'] },
        'db': { expertise: 'Database design, optimization, and SQL', focus: ['PostgreSQL', 'MongoDB', 'Redis', 'SQL optimization'], patterns: ['Indexing', 'Query optimization', 'Data modeling'] },
        'kilo': { expertise: 'Master orchestration agent for Claw Federation', focus: ['Multi-agent coordination', 'Task routing', 'System integration'], patterns: ['Agent delegation', 'Session management', 'Context injection'] },
        'claw': { expertise: 'Second master agent - parallel to Kilo', focus: ['Multi-agent collaboration', 'Screenshot analysis', 'OpenClaw integration'], patterns: ['Agent coordination', 'Visual data processing', 'Cloud session retrieval'] }
    };

    return contextMap[agentType] || contextMap['code'];
}

/**
 * Get universal context without bootstrapping
 */
export async function getUniversalContext() {
    const sessions = await loadAllSessions();
    return extractUniversalContext(sessions);
}

/**
 * Consolidate memory from all agents into unified brain
 */
export async function consolidateMemory() {
    console.log('[Context] Starting memory consolidation...');

    const sessions = await loadAllSessions();
    const unifiedBrain = {
        version: '1.0',
        lastConsolidated: new Date().toISOString(),
        agents: {},
        sharedKnowledge: [],
        securityPatterns: []
    };

    for (const [agentName, sessionData] of Object.entries(sessions)) {
        unifiedBrain.agents[agentName] = {
            description: sessionData.description || '',
            sessionCount: sessionData.sessions?.length || 0,
            lastUpdated: sessionData.lastUpdated,
            created: sessionData.created
        };

        if (sessionData.sessions) {
            sessionData.sessions.forEach(session => {
                if (session.messages) {
                    const lastMsg = session.messages[session.messages.length - 1];
                    if (lastMsg?.content) {
                        unifiedBrain.sharedKnowledge.push({
                            agent: agentName,
                            content: lastMsg.content.substring(0, 500),
                            timestamp: session.timestamp
                        });
                    }
                }
            });
        }
    }

    unifiedBrain.securityPatterns = [
        'Allowlist permitted commands',
        'Blocklist dangerous patterns',
        'shell: false for all process spawns',
        'Input validation required',
        'Output size limits'
    ];

    const unifiedPath = path.join(MEMORY_DIR, 'unified-brain.json');
    fs.writeFileSync(unifiedPath, JSON.stringify(unifiedBrain, null, 2));

    console.log('[Context] Memory consolidation complete');
    return unifiedBrain;
}

export default {
    loadAllSessions,
    extractUniversalContext,
    bootstrapAgent,
    getContextForAgentType,
    getUniversalContext,
    consolidateMemory
};