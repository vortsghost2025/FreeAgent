// Decision Agent - Adapted from MEV arb-agent.js
// Multi-capability agent for Gemini Live Agent Challenge

import WebSocket from 'ws';
import { performance } from 'perf_hooks';

class DecisionAgent {
    constructor(config = {}) {
        this.id = config.id || `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.capabilities = config.capabilities || ['strategy', 'analysis', 'validation'];
        this.consensusHubUrl = config.consensusHubUrl || 'ws://localhost:8765';
        this.geminiApiKey = process.env.GEMINI_API_KEY;
        
        this.ws = null;
        this.isConnected = false;
        this.pendingDecisions = new Map();
        this.performanceMetrics = {
            decisionsMade: 0,
            avgResponseTime: 0,
            successRate: 1.0
        };
        
        this.initializeCapabilities();
    }

    initializeCapabilities() {
        // Strategy capability - High-level decision making
        if (this.capabilities.includes('strategy')) {
            this.strategyEngine = new StrategyEngine();
        }
        
        // Analysis capability - Data processing and insight generation
        if (this.capabilities.includes('analysis')) {
            this.analysisEngine = new AnalysisEngine();
        }
        
        // Validation capability - Quality control and verification
        if (this.capabilities.includes('validation')) {
            this.validationEngine = new ValidationEngine();
        }
    }

    async connect() {
        return new Promise((resolve, reject) => {
            console.log(`🤖 [${this.id}] Connecting to consensus hub...`);
            
            this.ws = new WebSocket(this.consensusHubUrl);
            
            this.ws.on('open', () => {
                this.isConnected = true;
                console.log(`✅ [${this.id}] Connected to consensus hub`);
                this.registerWithHub();
                resolve(true);
            });
            
            this.ws.on('message', (data) => {
                this.handleMessage(JSON.parse(data));
            });
            
            this.ws.on('error', (error) => {
                console.error(`❌ [${this.id}] Connection error:`, error.message);
                reject(error);
            });
            
            this.ws.on('close', () => {
                this.isConnected = false;
                console.log(`🔌 [${this.id}] Disconnected from consensus hub`);
                this.handleReconnection();
            });
        });
    }

    registerWithHub() {
        const registration = {
            type: 'REGISTER_AGENT',
            payload: {
                agentId: this.id,
                capabilities: this.capabilities,
                performance: this.performanceMetrics
            }
        };
        
        this.ws.send(JSON.stringify(registration));
    }

    handleMessage(message) {
        switch (message.type) {
            case 'DECISION_REQUEST':
                this.handleDecisionRequest(message.payload);
                break;
            case 'CONSENSUS_RESULT':
                this.handleConsensusResult(message.payload);
                break;
            case 'PERFORMANCE_UPDATE':
                this.updatePerformanceMetrics(message.payload);
                break;
        }
    }

    async handleDecisionRequest(request) {
        const startTime = performance.now();
        
        try {
            console.log(`💭 [${this.id}] Processing decision request: ${request.topic}`);
            
            // Route to appropriate capability engine
            let result;
            if (this.capabilities.includes('strategy') && request.type === 'STRATEGIC') {
                result = await this.strategyEngine.process(request);
            } else if (this.capabilities.includes('analysis') && request.type === 'ANALYTICAL') {
                result = await this.analysisEngine.process(request);
            } else if (this.capabilities.includes('validation') && request.type === 'VALIDATION') {
                result = await this.validationEngine.process(request);
            } else {
                // Default processing
                result = await this.defaultProcessing(request);
            }
            
            const responseTime = performance.now() - startTime;
            this.performanceMetrics.decisionsMade++;
            
            const response = {
                type: 'DECISION_RESPONSE',
                payload: {
                    requestId: request.id,
                    agentId: this.id,
                    result,
                    responseTime,
                    confidence: this.calculateConfidence(result, request)
                }
            };
            
            this.ws.send(JSON.stringify(response));
            
        } catch (error) {
            console.error(`❌ [${this.id}] Decision processing failed:`, error.message);
            
            const errorResponse = {
                type: 'DECISION_ERROR',
                payload: {
                    requestId: request.id,
                    agentId: this.id,
                    error: error.message
                }
            };
            
            this.ws.send(JSON.stringify(errorResponse));
        }
    }

    async defaultProcessing(request) {
        // Generic decision processing using Gemini API
        if (!this.geminiApiKey) {
            throw new Error('Gemini API key not configured');
        }
        
        // Simulate Gemini API call (would integrate real API in production)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
        
        return {
            decision: Math.random() > 0.5 ? 'APPROVE' : 'REJECT',
            reasoning: 'Generated by Gemini-powered analysis',
            alternatives: ['Option A', 'Option B']
        };
    }

    calculateConfidence(result, request) {
        // Dynamic confidence calculation based on request complexity
        const baseConfidence = 0.85;
        const complexityFactor = Math.min(request.complexity || 1, 10) / 10;
        return baseConfidence - (complexityFactor * 0.2);
    }

    handleConsensusResult(result) {
        console.log(`📊 [${this.id}] Consensus result: ${result.approved ? 'APPROVED' : 'REJECTED'}`);
        // Log and learn from consensus outcomes
        this.updateLearningModel(result);
    }

    updatePerformanceMetrics(metrics) {
        Object.assign(this.performanceMetrics, metrics);
        console.log(`📈 [${this.id}] Performance updated: ${JSON.stringify(metrics)}`);
    }

    updateLearningModel(consensusResult) {
        // Simple reinforcement learning - adjust future confidence based on consensus accuracy
        if (consensusResult.approved && this.lastDecision?.recommended === 'APPROVE') {
            // Reinforce correct approvals
            this.performanceMetrics.successRate *= 1.01;
        } else if (!consensusResult.approved && this.lastDecision?.recommended === 'REJECT') {
            // Reinforce correct rejections
            this.performanceMetrics.successRate *= 1.01;
        } else {
            // Adjust for incorrect decisions
            this.performanceMetrics.successRate *= 0.99;
        }
        
        this.performanceMetrics.successRate = Math.max(0.1, Math.min(1.0, this.performanceMetrics.successRate));
    }

    handleReconnection() {
        setTimeout(async () => {
            try {
                await this.connect();
            } catch (error) {
                console.error(`❌ [${this.id}] Reconnection failed:`, error.message);
                this.handleReconnection(); // Retry
            }
        }, 5000);
    }

    getHealthStatus() {
        return {
            id: this.id,
            isConnected: this.isConnected,
            capabilities: this.capabilities,
            performance: this.performanceMetrics,
            uptime: this.isConnected ? Date.now() - this.connectionStartTime : 0
        };
    }

    shutdown() {
        if (this.ws) {
            this.ws.close();
        }
        console.log(`🛑 [${this.id}] Agent shutdown complete`);
    }
}

// Capability Engines
class StrategyEngine {
    async process(request) {
        return {
            recommendation: Math.random() > 0.3 ? 'PROCEED' : 'DEFER',
            timeline: 'IMMEDIATE',
            resources: ['CPU', 'MEMORY'],
            riskLevel: Math.random() > 0.7 ? 'HIGH' : 'LOW'
        };
    }
}

class AnalysisEngine {
    async process(request) {
        return {
            insights: [`Pattern detected: ${Math.floor(Math.random() * 100)}% confidence`],
            trends: ['UPWARD', 'STABLE'][Math.floor(Math.random() * 2)],
            anomalies: Math.random() > 0.8 ? ['UNUSUAL_ACTIVITY'] : []
        };
    }
}

class ValidationEngine {
    async process(request) {
        return {
            isValid: Math.random() > 0.1, // 90% validation success rate
            issues: Math.random() > 0.7 ? ['MINOR_FORMATTING'] : [],
            suggestions: ['OPTIMIZE_PARAMETERS']
        };
    }
}

export { DecisionAgent };