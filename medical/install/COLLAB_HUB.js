// 🧠 ORGANISM NERVOUS SYSTEM
// Broadcast-first message bus for collective agent awareness
// Every agent hears everything, responds selectively

import fs from 'fs';
import path from 'path';

class CooperativeSwarm {
    // Cooperative + Role-Based Broadcast Architecture
    // Every agent hears everything, acts selectively by role
    constructor() {
        this.channelPath = 'C:\\workspace\\medical\\install\\COOPERATIVE_SWARM.json';
        this.initializeRoleBasedNetwork();
        this.roles = new Map(); // Role definitions
        this.cooperationRules = new Map(); // How roles interact
        this.activeAgents = new Map(); // Currently active agents by role
    }
    
    initializeRoleBasedNetwork() {
        if (!fs.existsSync(this.channelPath)) {
            const swarmState = {
                timestamp: new Date().toISOString(),
                roles: this.getDefaultRoles(),
                agents: {}, // Active agents by role
                signals: [], // Broadcast messages
                cooperation_log: [], // Who helped whom
                collective_state: { // Unified system view
                    mode: 'economic',
                    sub_mode: 'aggressive',
                    health: 'stable',
                    opportunities: [],
                    stress_level: 0,
                    active_roles: []
                }
            };
            fs.writeFileSync(this.channelPath, JSON.stringify(swarmState, null, 2));
        }
    }
    
    // Role-based agent registration
    registerAgent(agentId, role, capabilities, cooperationLevel = 'full') {
        const network = this.readNetwork();
        
        // Validate role exists
        if (!network.roles[role]) {
            throw new Error(`Invalid role: ${role}. Available roles: ${Object.keys(network.roles).join(', ')}`);
        }
        
        // Register agent
        network.agents[agentId] = {
            role: role,
            capabilities: capabilities,
            cooperation_level: cooperationLevel,
            registered: new Date().toISOString(),
            status: 'active',
            last_activity: null
        };
        
        // Track active roles
        if (!network.collective_state.active_roles.includes(role)) {
            network.collective_state.active_roles.push(role);
        }
        
        this.writeNetwork(network);
        this.activeAgents.set(agentId, {role, capabilities, cooperationLevel});
        
        console.log(`[AGENT REGISTERED] ${agentId} as ${role}`);
        
        // Broadcast registration to entire swarm
        this.broadcastToSwarm('agent_registered', {
            agent: agentId,
            role: role,
            capabilities: capabilities,
            cooperation_level: cooperationLevel
        }, 'normal');
        
        return agentId;
    }
    
    // Define default roles for your swarm
    getDefaultRoles() {
        return {
            'meta_controller': {
                responsibilities: ['set_global_mode', 'adjust_thresholds', 'coordinate_swarm'],
                listens_to: ['all'],
                can_broadcast: ['mode_changes', 'threshold_updates'],
                cooperation_style: 'directive'
            },
            'economic_engine': {
                responsibilities: ['filter_opportunities', 'evaluate_profitability', 'risk_assessment'],
                listens_to: ['arbitrage_opportunities', 'market_data', 'mode_changes'],
                can_broadcast: ['opportunity_decisions', 'risk_assessments'],
                cooperation_style: 'analytical'
            },
            'strategy_worker': {
                responsibilities: ['execute_strategies', 'process_tasks', 'report_results'],
                listens_to: ['opportunity_decisions', 'mode_changes', 'task_assignments'],
                can_broadcast: ['execution_results', 'task_completion'],
                cooperation_style: 'executive'
            },
            'health_monitor': {
                responsibilities: ['watch_performance', 'detect_stress', 'alert_system'],
                listens_to: ['all'],
                can_broadcast: ['health_alerts', 'performance_metrics'],
                cooperation_style: 'observational'
            },
            'vscode_agent': {
                responsibilities: ['code_review', 'debugging', 'patching'],
                listens_to: ['health_alerts', 'execution_errors', 'code_requests'],
                can_broadcast: ['code_patches', 'debug_info'],
                cooperation_style: 'supportive'
            },
            'lmstudio_agent': {
                responsibilities: ['reasoning', 'planning', 'analysis'],
                listens_to: ['complex_problems', 'strategic_decisions', 'analysis_requests'],
                can_broadcast: ['insights', 'plans', 'recommendations'],
                cooperation_style: 'advisory'
            },
            'cockpit_dashboard': {
                responsibilities: ['visualization', 'oversight', 'user_interface'],
                listens_to: ['all'],
                can_broadcast: ['display_updates', 'user_commands'],
                cooperation_style: 'presentational'
            }
        };
    }
    
    registerSensor(sensorId, type, capabilities) {
        const network = this.readNetwork();
        network.sensors[sensorId] = {
            type: type,
            capabilities: capabilities,
            connected: new Date().toISOString(),
            sensitivity: 1.0,
            last_signal: null
        };
        this.writeNetwork(network);
        this.sensors.set(sensorId, {type, capabilities});
        console.log(`[SENSOR REGISTERED] ${sensorId} as ${type}`);
        
        // Broadcast sensor registration to entire network
        this.broadcastImpulse('sensor_registered', {
            sensor: sensorId,
            type: type,
            capabilities: capabilities
        });
    }
    
    // Cooperative broadcast with role-based filtering
    broadcastToSwarm(type, payload, priority = 'normal', sourceRole = null) {
        const network = this.readNetwork();
        
        // Create broadcast message
        const message = {
            id: `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: type,
            payload: payload,
            priority: priority,
            timestamp: new Date().toISOString(),
            source_role: sourceRole,
            broadcast_to: 'all_agents', // Everyone hears this
            cooperation_log: [] // Track who responded
        };
        
        network.signals.push(message);
        this.writeNetwork(network);
        
        console.log(`[SWARM BROADCAST] ${type}: ${JSON.stringify(payload).substring(0, 100)}...`);
        return message.id;
    }
    
    // Role-based message handling
    handleMessage(agentId, message) {
        const agent = this.activeAgents.get(agentId);
        if (!agent) return false;
        
        const role = agent.role;
        const network = this.readNetwork();
        const roleDefinition = network.roles[role];
        
        // Check if agent should respond to this message type
        const shouldRespond = this.shouldAgentRespond(roleDefinition, message.type);
        
        if (shouldRespond) {
            console.log(`[ROLE RESPONSE] ${agentId} (${role}) responding to ${message.type}`);
            
            // Log cooperation
            this.logCooperation(agentId, role, message.type, 'responded');
            return true;
        }
        
        return false;
    }
    
    shouldAgentRespond(roleDefinition, messageType) {
        // Role-based filtering logic
        if (roleDefinition.listens_to.includes('all')) {
            return true; // Listen to everything
        }
        
        return roleDefinition.listens_to.includes(messageType);
    }
    
    logCooperation(agentId, role, action, result) {
        const network = this.readNetwork();
        network.cooperation_log.push({
            timestamp: new Date().toISOString(),
            agent: agentId,
            role: role,
            action: action,
            result: result
        });
        this.writeNetwork(network);
    }
    
    // Broadcast-first neural signaling
    broadcastSignal(type, payload, priority = 'normal') {
        const network = this.readNetwork();
        const signal = {
            id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: type,
            payload: payload,
            priority: priority,
            timestamp: new Date().toISOString(),
            origin: 'neural_bus',
            broadcast_to: 'all_sensors' // Everyone hears this
        };
        
        network.signals.push(signal);
        this.writeNetwork(network);
        
        console.log(`[NERVE IMPULSE] ${type}: ${JSON.stringify(payload).substring(0, 100)}...`);
        return signal.id;
    }
    
    // Specific broadcast types for your organism
    broadcastModeChange(newMode, parameters) {
        this.broadcastSignal('mode_change', {
            from: this.currentMode || 'unknown',
            to: newMode,
            parameters: parameters,
            timestamp: Date.now()
        }, 'high');
        this.currentMode = newMode;
    }
    
    broadcastOpportunity(opportunityData) {
        this.broadcastSignal('arbitrage_opportunity', {
            profit: opportunityData.profit,
            pair: opportunityData.pair,
            confidence: opportunityData.confidence,
            strategy: opportunityData.strategy
        }, 'urgent');
    }
    
    broadcastHealthAlert(alertType, severity, details) {
        this.broadcastSignal('health_alert', {
            type: alertType,
            severity: severity,
            details: details,
            affected_components: details.affected || []
        }, severity === 'critical' ? 'critical' : 'high');
    }
    
    sendMessage(from, content, type = 'message') {
        const channel = this.readChannel();
        const message = {
            id: Date.now().toString(),
            from: from,
            content: content,
            type: type,
            timestamp: new Date().toISOString()
        };
        channel.messages.push(message);
        this.writeChannel(channel);
        console.log(`[${from}]: ${content}`);
        return message.id;
    }
    
    // Reflex responses (automatic reactions)
    triggerReflex(reflexType, triggerCondition, responseAction) {
        const network = this.readNetwork();
        const reflex = {
            id: `reflex_${Date.now()}`,
            type: reflexType,
            trigger: triggerCondition,
            action: responseAction,
            created: new Date().toISOString()
        };
        network.reflexes.push(reflex);
        this.writeNetwork(network);
        return reflex.id;
    }
    
    assignTask(assigner, assignee, taskDescription, priority = 'medium') {
        const channel = this.readChannel();
        const task = {
            id: `task_${Date.now()}`,
            assigner: assigner,
            assignee: assignee,
            description: taskDescription,
            priority: priority,
            status: 'pending',
            created: new Date().toISOString()
        };
        channel.tasks.push(task);
        this.writeChannel(channel);
        console.log(`[TASK ASSIGNED] ${assigner} → ${assignee}: ${taskDescription}`);
        return task.id;
    }
    
    makeDecision(decider, decision, rationale) {
        const channel = this.readChannel();
        const decisionObj = {
            id: `decision_${Date.now()}`,
            decider: decider,
            decision: decision,
            rationale: rationale,
            timestamp: new Date().toISOString()
        };
        channel.decisions.push(decisionObj);
        this.writeChannel(channel);
        console.log(`[DECISION] ${decider}: ${decision}`);
        return decisionObj.id;
    }
    
    readNetwork() {
        const data = fs.readFileSync(this.channelPath, 'utf8');
        return JSON.parse(data);
    }
    
    writeNetwork(data) {
        fs.writeFileSync(this.channelPath, JSON.stringify(data, null, 2));
    }
    
    getLatestMessages(count = 5) {
        const channel = this.readChannel();
        return channel.messages.slice(-count);
    }
    
    getPendingTasks() {
        const channel = this.readChannel();
        return channel.tasks.filter(task => task.status === 'pending');
    }
}

// Export for immediate use
const swarm = new CooperativeSwarm();

// Quick setup for Sean and Kilo
console.log('🚀 COOPERATIVE SWARM ACTIVATED');
console.log('================================');
swarm.registerAgent('sean', 'meta_controller', ['project_lead', 'decision_making'], 'full');
swarm.registerAgent('kilo', 'vscode_agent', ['code_review', 'architecture'], 'full'); 
swarm.registerAgent('qwen', 'lmstudio_agent', ['technical_advice', 'analysis'], 'full');

export default swarm;