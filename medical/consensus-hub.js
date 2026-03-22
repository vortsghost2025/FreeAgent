// Multi-Agent Consensus Hub
// Coordinates decisions between Lingma, Qwen, and User
// Integrated with MCP bridge and task queue system

import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

class ConsensusCoordinator extends EventEmitter {
    constructor() {
        super();
        this.agents = new Map();
        this.decisions = new Map();
        this.consensusThreshold = 0.67; // 2 out of 3 agreement
        this.pendingTimeouts = new Map(); // Track timeouts for cleanup
        this.mcpFile = path.join(process.cwd(), 'agent-memory', 'shared-workspace', 'qwen-messages.json');
        this.consensusInputFile = path.join(process.cwd(), 'agent-memory', 'shared-workspace', 'consensus-input.json');
        this.consensusVotesFile = path.join(process.cwd(), 'agent-memory', 'shared-workspace', 'consensus-votes.json');
        this.initializeMCPFiles();
    }

    initializeMCPFiles() {
        // Ensure MCP directory exists
        const mcpDir = path.dirname(this.mcpFile);
        if (!fs.existsSync(mcpDir)) {
            fs.mkdirSync(mcpDir, { recursive: true });
        }

        // Initialize MCP message file
        if (!fs.existsSync(this.mcpFile)) {
            fs.writeFileSync(this.mcpFile, JSON.stringify({
                messages: [],
                metadata: {
                    createdAt: Date.now(),
                    version: '1.0'
                }
            }, null, 2));
        }

        // Initialize consensus files
        if (!fs.existsSync(this.consensusInputFile)) {
            fs.writeFileSync(this.consensusInputFile, JSON.stringify({
                proposals: [],
                active: {}
            }, null, 2));
        }

        if (!fs.existsSync(this.consensusVotesFile)) {
            fs.writeFileSync(this.consensusVotesFile, JSON.stringify({
                votes: [],
                tally: {}
            }, null, 2));
        }
    }

    broadcastToMCP(message) {
        try {
            const mcpData = JSON.parse(fs.readFileSync(this.mcpFile, 'utf8'));
            mcpData.messages.push({
                from: 'consensus-hub',
                to: 'all',
                content: message,
                timestamp: Date.now()
            });
            fs.writeFileSync(this.mcpFile, JSON.stringify(mcpData, null, 2));
            console.log(`📤 Broadcast to MCP: ${message.substring(0, 100)}...`);
        } catch (error) {
            console.error('❌ Failed to broadcast to MCP:', error.message);
        }
    }

    requestConsensus(taskId, proposal, proposer) {
        try {
            const consensusInput = {
                taskId: taskId,
                proposal: proposal,
                proposer: proposer,
                requestedAt: Date.now(),
                requiredVotes: 2,
                status: 'pending'
            };
            
            const inputData = JSON.parse(fs.readFileSync(this.consensusInputFile, 'utf8'));
            inputData.proposals.push(consensusInput);
            inputData.active[taskId] = consensusInput;
            fs.writeFileSync(this.consensusInputFile, JSON.stringify(inputData, null, 2));
            
            console.log(`📝 Consensus requested: ${proposal}`);
            this.broadcastToMCP(`🗳️ CONSENSUS REQUESTED: ${proposal} (Task: ${taskId})`);
            
            return consensusInput;
        } catch (error) {
            console.error('❌ Failed to request consensus:', error.message);
            return null;
        }
    }

    registerAgent(agentId, capabilities) {
        this.agents.set(agentId, {
            id: agentId,
            capabilities,
            votes: new Map(),
            status: 'online'
        });
        console.log(`🤖 Agent ${agentId} registered for consensus`);
        this.broadcastToMCP(`🤖 AGENT ONLINE: ${agentId} registered for consensus`);
    }

    async proposeDecision(decisionId, proposal, proposer) {
        const decision = {
            id: decisionId,
            proposal,
            proposer,
            votes: new Map(),
            createdAt: Date.now(),
            status: 'voting'
        };

        this.decisions.set(decisionId, decision);
        this.emit('decision.proposed', decision);
        
        // Give agents time to vote - track timeout for cleanup
        const timeoutId = setTimeout(() => this.evaluateConsensus(decisionId), 5000);
        this.pendingTimeouts.set(decisionId, timeoutId);
        
        return decision;
    }

    // Cleanup method to clear all pending timeouts
    shutdown() {
        for (const [decisionId, timeoutId] of this.pendingTimeouts) {
            clearTimeout(timeoutId);
            this.pendingTimeouts.delete(decisionId);
        }
        console.log('Consensus coordinator shut down, all timeouts cleared');
    }

    vote(decisionId, agentId, vote, reasoning = '') {
        const decision = this.decisions.get(decisionId);
        if (!decision) return false;

        decision.votes.set(agentId, { vote, reasoning, timestamp: Date.now() });
        this.emit('decision.voted', { decisionId, agentId, vote, reasoning });
        
        // Sync vote to MCP
        this.broadcastToMCP(`🗳️ VOTE: ${agentId} voted ${vote} on ${decisionId} | Reason: ${reasoning}`);
        
        return true;
    }

    evaluateConsensus(decisionId) {
        const decision = this.decisions.get(decisionId);
        if (!decision) return;

        const votes = Array.from(decision.votes.values());
        const yesVotes = votes.filter(v => v.vote === 'yes').length;
        const totalVotes = votes.length;
        const agreementRatio = totalVotes > 0 ? yesVotes / totalVotes : 0;

        if (agreementRatio >= this.consensusThreshold) {
            decision.status = 'approved';
            decision.finalizedAt = Date.now();
            this.emit('decision.approved', decision);
            console.log(`✅ Decision ${decisionId} APPROVED (${yesVotes}/${totalVotes} votes)`);
            this.broadcastToMCP(`✅ CONSENSUS APPROVED: ${decision.proposal} (${yesVotes}/${totalVotes} votes)`);
        } else {
            decision.status = 'rejected';
            decision.finalizedAt = Date.now();
            this.emit('decision.rejected', decision);
            console.log(`❌ Decision ${decisionId} REJECTED (${yesVotes}/${totalVotes} votes)`);
            this.broadcastToMCP(`❌ CONSENSUS REJECTED: ${decision.proposal} (${yesVotes}/${totalVotes} votes)`);
        }

        return decision;
    }

    getActiveDecisions() {
        return Array.from(this.decisions.values())
            .filter(d => d.status === 'voting');
    }

    getAgentStatus() {
        return Object.fromEntries(this.agents);
    }
}

// Create the coordinator
const coordinator = new ConsensusCoordinator();

// Register all agents
coordinator.registerAgent('user', ['strategic-direction', 'final-approval', 'creativity']);
coordinator.registerAgent('lingma', ['code-execution', 'technical-implementation', 'testing']);
coordinator.registerAgent('qwen', ['strategy-analysis', 'optimization', 'research']);

// WebSocket server for real-time communication
import { WebSocketServer } from 'ws';
const wss = new WebSocketServer({ port: 8765 });

wss.on('connection', (ws, req) => {
    console.log('🔗 New agent connected to consensus hub');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch(data.type) {
                case 'vote':
                    coordinator.vote(data.decisionId, data.agentId, data.vote, data.reasoning);
                    break;
                case 'propose':
                    coordinator.proposeDecision(data.decisionId, data.proposal, data.proposer);
                    break;
                case 'status':
                    ws.send(JSON.stringify({
                        type: 'status',
                        agents: coordinator.getAgentStatus(),
                        decisions: coordinator.getActiveDecisions()
                    }));
                    break;
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    // Send initial status
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to Multi-Agent Consensus Hub',
        timestamp: Date.now()
    }));
});

// Event listeners for consensus events
coordinator.on('decision.proposed', (decision) => {
    console.log(`📢 NEW PROPOSAL: ${decision.proposal}`);
    broadcastToAll({ type: 'proposal', decision });
});

coordinator.on('decision.approved', (decision) => {
    console.log(`🎉 CONSENSUS REACHED: ${decision.proposal}`);
    broadcastToAll({ type: 'consensus.reached', decision });
});

coordinator.on('decision.rejected', (decision) => {
    console.log(`🤔 CONSENSUS FAILED: ${decision.proposal}`);
    broadcastToAll({ type: 'consensus.failed', decision });
});

function broadcastToAll(message) {
    const msg = JSON.stringify(message);
    wss.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(msg);
        }
    });
}

console.log('🚀 Multi-Agent Consensus Hub ACTIVE on ws://localhost:8765');
console.log('🤖 Registered agents:', Array.from(coordinator.agents.keys()));
console.log('⚖️  Consensus threshold: 67% (2/3 agreement)');

// Example usage:
// coordinator.proposeDecision('mev-deployment', 'Deploy MEV swarm to mainnet', 'user');
// coordinator.vote('mev-deployment', 'lingma', 'yes', 'Code is production-ready');
// coordinator.vote('mev-deployment', 'qwen', 'yes', 'Market conditions favorable');