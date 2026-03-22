// Enhanced Consensus Coordinator - Adapted for Gemini Challenge
// Multi-agent coordination with advanced voting and learning

import { WebSocketServer } from 'ws';
import { performance } from 'perf_hooks';

class ConsensusCoordinator {
    constructor(config = {}) {
        this.port = config.port || 8765;
        this.agents = new Map();
        this.pendingDecisions = new Map();
        this.decisionHistory = [];
        this.learningModel = new LearningModel();
        
        this.wss = null;
        this.server = null;
        this.decisionCounter = 0;
        
        // Consensus parameters
        this.consensusThreshold = config.threshold || 0.67; // 67% agreement
        this.votingTimeout = config.timeout || 30000; // 30 seconds
        this.maxRetries = config.maxRetries || 3;
        
        this.initializeServer();
    }

    initializeServer() {
        this.wss = new WebSocketServer({ port: this.port });
        
        this.wss.on('connection', (ws, req) => {
            this.handleNewConnection(ws, req);
        });
        
        console.log(`🚀 Consensus Coordinator ACTIVE on ws://localhost:${this.port}`);
        console.log(`⚖️  Consensus threshold: ${(this.consensusThreshold * 100).toFixed(0)}%`);
    }

    handleNewConnection(ws, req) {
        const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const agent = {
            id: agentId,
            ws,
            capabilities: [],
            performance: { decisions: 0, correct: 0, avgResponse: 0 },
            connectionTime: Date.now(),
            lastActivity: Date.now()
        };
        
        this.agents.set(agentId, agent);
        
        console.log(`🤖 Agent ${agentId} connected for consensus`);
        
        ws.on('message', (message) => {
            this.handleAgentMessage(agentId, JSON.parse(message));
        });
        
        ws.on('close', () => {
            this.handleAgentDisconnect(agentId);
        });
        
        ws.on('error', (error) => {
            console.error(`Agent ${agentId} error:`, error.message);
            this.handleAgentDisconnect(agentId);
        });
    }

    handleAgentMessage(agentId, message) {
        const agent = this.agents.get(agentId);
        if (!agent) return;
        
        agent.lastActivity = Date.now();
        
        switch (message.type) {
            case 'REGISTER_AGENT':
                this.registerAgent(agentId, message.payload);
                break;
            case 'DECISION_RESPONSE':
                this.handleDecisionResponse(message.payload);
                break;
            case 'DECISION_ERROR':
                this.handleDecisionError(message.payload);
                break;
            case 'REQUEST_DECISION':
                this.initiateDecision(message.payload);
                break;
        }
    }

    registerAgent(agentId, payload) {
        const agent = this.agents.get(agentId);
        if (agent) {
            agent.capabilities = payload.capabilities || [];
            agent.performance = payload.performance || { decisions: 0, correct: 0, avgResponse: 0 };
            
            console.log(`📋 Agent ${agentId} registered with capabilities: ${agent.capabilities.join(', ')}`);
            
            // Send welcome message with system status
            this.sendToAgent(agentId, {
                type: 'REGISTRATION_CONFIRMED',
                payload: {
                    agentId,
                    systemStatus: this.getSystemStatus(),
                    consensusRules: {
                        threshold: this.consensusThreshold,
                        timeout: this.votingTimeout
                    }
                }
            });
        }
    }

    initiateDecision(payload) {
        const decisionId = `decision_${++this.decisionCounter}`;
        const startTime = performance.now();
        
        const decision = {
            id: decisionId,
            topic: payload.topic,
            type: payload.type,
            requester: payload.requester,
            votes: [],
            responses: [],
            yesVotes: 0,
            noVotes: 0,
            totalWeight: 0,
            weightedYes: 0,
            weightedNo: 0,
            status: 'voting',
            createdAt: Date.now(),
            startedAt: startTime,
            deadline: Date.now() + this.votingTimeout
        };
        
        this.pendingDecisions.set(decisionId, decision);
        
        // Broadcast decision request to all capable agents
        this.broadcastToAgents({
            type: 'DECISION_REQUEST',
            payload: {
                id: decisionId,
                ...payload
            }
        });
        
        console.log(`⚖️  Decision initiated: ${payload.topic} (${payload.type})`);
        
        // Set timeout for decision evaluation
        setTimeout(() => {
            this.evaluateDecision(decisionId);
        }, this.votingTimeout);
    }

    handleDecisionResponse(payload) {
        const decision = this.pendingDecisions.get(payload.requestId);
        if (!decision) return;
        
        const agent = this.agents.get(payload.agentId);
        if (!agent) return;
        
        // Calculate vote weight based on agent performance
        const weight = this.calculateAgentWeight(agent, payload);
        
        const vote = {
            agentId: payload.agentId,
            decision: payload.result.decision,
            confidence: payload.confidence,
            weight,
            responseTime: payload.responseTime,
            timestamp: Date.now()
        };
        
        decision.votes.push(vote);
        decision.responses.push(payload);
        
        if (payload.result.decision === 'APPROVE') {
            decision.yesVotes++;
            decision.weightedYes += weight;
        } else {
            decision.noVotes++;
            decision.weightedNo += weight;
        }
        
        decision.totalWeight += weight;
        
        agent.performance.decisions++;
        agent.performance.avgResponse = (
            (agent.performance.avgResponse * (agent.performance.decisions - 1) + payload.responseTime) / 
            agent.performance.decisions
        );
        
        console.log(`🗳️  Vote received: ${payload.agentId} -> ${payload.result.decision} (${weight.toFixed(3)})`);
        
        // Check for early consensus
        this.checkEarlyConsensus(decision);
    }

    calculateAgentWeight(agent, response) {
        // Weight based on performance metrics
        const successRate = agent.performance.decisions > 0 ? 
            agent.performance.correct / agent.performance.decisions : 0.5;
        
        const speedFactor = Math.max(0.1, 1 - (response.responseTime / 5000)); // Normalize to 5s max
        const confidenceWeight = response.confidence || 0.5;
        
        return (successRate * 0.4) + (speedFactor * 0.3) + (confidenceWeight * 0.3);
    }

    checkEarlyConsensus(decision) {
        const totalVotes = decision.yesVotes + decision.noVotes;
        if (totalVotes < 2) return; // Need minimum votes
        
        const approvalRatio = decision.totalWeight > 0 ? 
            decision.weightedYes / decision.totalWeight : 0;
        
        const requiredVotes = Math.ceil(this.agents.size * 0.5); // 50% participation minimum
        
        if (totalVotes >= requiredVotes) {
            if (approvalRatio >= this.consensusThreshold) {
                this.finalizeDecision(decision.id, true, approvalRatio);
            } else if ((1 - approvalRatio) >= this.consensusThreshold) {
                this.finalizeDecision(decision.id, false, 1 - approvalRatio);
            }
        }
    }

    evaluateDecision(decisionId) {
        const decision = this.pendingDecisions.get(decisionId);
        if (!decision || decision.status !== 'voting') return;
        
        const approvalRatio = decision.totalWeight > 0 ? 
            decision.weightedYes / decision.totalWeight : 0;
        
        const approved = approvalRatio >= this.consensusThreshold;
        
        this.finalizeDecision(decisionId, approved, approvalRatio);
    }

    finalizeDecision(decisionId, approved, approvalRatio) {
        const decision = this.pendingDecisions.get(decisionId);
        if (!decision) return;
        
        decision.status = 'completed';
        decision.finalResult = {
            approved,
            approvalRatio,
            yesVotes: decision.yesVotes,
            noVotes: decision.noVotes,
            totalVotes: decision.votes.length,
            weightedApproval: approvalRatio
        };
        
        // Update agent performance based on consensus outcome
        this.updateAgentPerformance(decision);
        
        // Store in history
        this.decisionHistory.push({
            ...decision,
            completedAt: Date.now()
        });
        
        // Broadcast result
        this.broadcastToAgents({
            type: 'CONSENSUS_RESULT',
            payload: decision
        });
        
        console.log(`📊 CONSENSUS RESULT: ${approved ? 'APPROVED' : 'REJECTED'} (${(approvalRatio * 100).toFixed(1)}%)`);
        
        // Clean up
        this.pendingDecisions.delete(decisionId);
    }

    updateAgentPerformance(decision) {
        decision.votes.forEach(vote => {
            const agent = this.agents.get(vote.agentId);
            if (agent) {
                const wasCorrect = (decision.finalResult.approved && vote.decision === 'APPROVE') ||
                                 (!decision.finalResult.approved && vote.decision === 'REJECT');
                
                if (wasCorrect) {
                    agent.performance.correct++;
                }
            }
        });
    }

    handleDecisionError(payload) {
        console.error(`❌ Decision error from ${payload.agentId}: ${payload.error}`);
        // Could implement retry logic or agent blacklisting here
    }

    handleAgentDisconnect(agentId) {
        this.agents.delete(agentId);
        console.log(`👋 Agent ${agentId} disconnected`);
        
        // Cancel any pending decisions this agent was involved in
        for (const [decisionId, decision] of this.pendingDecisions) {
            decision.votes = decision.votes.filter(vote => vote.agentId !== agentId);
            decision.responses = decision.responses.filter(resp => resp.agentId !== agentId);
        }
    }

    sendToAgent(agentId, message) {
        const agent = this.agents.get(agentId);
        if (agent && agent.ws.readyState === 1) {
            agent.ws.send(JSON.stringify(message));
        }
    }

    broadcastToAgents(message) {
        const messageStr = JSON.stringify(message);
        for (const [agentId, agent] of this.agents) {
            if (agent.ws.readyState === 1) {
                agent.ws.send(messageStr);
            }
        }
    }

    getSystemStatus() {
        return {
            agentsConnected: this.agents.size,
            pendingDecisions: this.pendingDecisions.size,
            totalDecisions: this.decisionHistory.length,
            averageConsensusTime: this.calculateAverageConsensusTime(),
            systemLoad: this.getSystemLoad()
        };
    }

    calculateAverageConsensusTime() {
        if (this.decisionHistory.length === 0) return 0;
        
        const totalTime = this.decisionHistory.reduce((sum, decision) => {
            return sum + (decision.completedAt - decision.startedAt);
        }, 0);
        
        return totalTime / this.decisionHistory.length;
    }

    getSystemLoad() {
        const activeAgents = Array.from(this.agents.values())
            .filter(agent => Date.now() - agent.lastActivity < 30000).length;
        
        return {
            totalAgents: this.agents.size,
            activeAgents,
            utilization: this.agents.size > 0 ? activeAgents / this.agents.size : 0
        };
    }

    shutdown() {
        if (this.wss) {
            this.wss.close();
        }
        console.log('🛑 Consensus Coordinator shutdown complete');
    }
}

// Learning Model for adaptive consensus
class LearningModel {
    constructor() {
        this.decisionPatterns = new Map();
        this.agentPerformance = new Map();
        this.optimalParameters = {
            threshold: 0.67,
            timeout: 30000
        };
    }
    
    // Would implement ML-based parameter optimization here
}

export { ConsensusCoordinator };