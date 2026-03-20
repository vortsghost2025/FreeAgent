// Enhanced Consensus Hub with Trade Scoring
// Multi-agent coordination with profitability-weighted voting

import { WebSocketServer } from 'ws';
import { profitabilityEngine } from './profitability-engine.js';

const wss = new WebSocketServer({ port: 8765 });
const agents = new Map();
const pendingDecisions = new Map();
const tradeProposals = new Map();
let decisionCounter = 0;

// Enhanced agent registration with expertise tracking
wss.on('connection', (ws, req) => {
  const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  agents.set(agentId, {
    ws,
    id: agentId,
    votes: [],
    expertise: {
      technical: Math.random() * 0.3 + 0.7, // 0.7-1.0
      economic: Math.random() * 0.3 + 0.7,
      timing: Math.random() * 0.3 + 0.7
    },
    performance: {
      correctVotes: 0,
      totalVotes: 0,
      avgConfidence: 0
    }
  });
  
  console.log(`🤖 Agent ${agentId} registered for enhanced consensus`);
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      await handleAgentMessage(agentId, data);
    } catch (error) {
      console.error('Message handling error:', error);
    }
  });
  
  ws.on('close', () => {
    agents.delete(agentId);
    console.log(`👋 Agent ${agentId} disconnected`);
  });
});

// Enhanced trade proposal handling with scoring
async function handleAgentMessage(agentId, data) {
  const agent = agents.get(agentId);
  
  switch (data.type) {
    case 'PROPOSE_TRADE':
      await handleTradeProposal(agentId, data.payload);
      break;
    case 'CAST_VOTE':
      await handleVote(agentId, data.payload);
      break;
    case 'REQUEST_CONSENSUS':
      await initiateConsensus(data.payload);
      break;
  }
}

// Score-based trade proposal evaluation
async function handleTradeProposal(agentId, proposal) {
  const proposalId = `proposal_${Date.now()}`;
  
  // Calculate profitability score
  const profitability = await profitabilityEngine.calculateNetProfit(
    proposal.route,
    proposal.tradeSize,
    proposal.ethPrice || 3000
  );
  
  // Calculate risk score
  const riskScore = calculateRiskScore(proposal);
  
  // Composite score combining profitability and risk
  const compositeScore = (profitability.roi * 0.7) - (riskScore * 0.3);
  
  const scoredProposal = {
    ...proposal,
    id: proposalId,
    proposer: agentId,
    profitability,
    riskScore,
    compositeScore,
    timestamp: Date.now(),
    status: 'pending'
  };
  
  tradeProposals.set(proposalId, scoredProposal);
  console.log(`💡 Trade Proposal #${proposalId.substring(0,8)}: ROI=${profitability.roi.toFixed(2)}%, Score=${compositeScore.toFixed(2)}`);
  
  // Automatically initiate consensus for high-scoring proposals
  if (compositeScore > 2.0) { // 2% minimum composite score
    await initiateConsensus({ proposalId, type: 'AUTOMATIC' });
  }
}

// Weighted voting based on agent expertise and performance
async function handleVote(agentId, vote) {
  const agent = agents.get(agentId);
  const proposal = tradeProposals.get(vote.proposalId);
  
  if (!proposal) return;
  
  // Calculate vote weight based on expertise and past performance
  const expertiseWeight = (
    agent.expertise.technical * 0.4 +
    agent.expertise.economic * 0.4 +
    agent.expertise.timing * 0.2
  );
  
  const performanceWeight = agent.performance.totalVotes > 0 ?
    agent.performance.correctVotes / agent.performance.totalVotes : 0.5;
  
  const confidenceWeight = Math.min(vote.confidence || 0.5, 1.0);
  
  const finalWeight = expertiseWeight * 0.5 + performanceWeight * 0.3 + confidenceWeight * 0.2;
  
  const weightedVote = {
    agentId,
    vote: vote.decision,
    weight: finalWeight,
    confidence: vote.confidence || 0.5,
    timestamp: Date.now()
  };
  
  agent.votes.push(weightedVote);
  
  // Update performance metrics
  if (proposal.status === 'executed') {
    const wasCorrect = (vote.decision === 'approve' && proposal.wasProfitable) ||
                      (vote.decision === 'reject' && !proposal.wasProfitable);
    
    agent.performance.correctVotes += wasCorrect ? 1 : 0;
    agent.performance.totalVotes += 1;
    agent.performance.avgConfidence = (
      (agent.performance.avgConfidence * (agent.performance.totalVotes - 1) + weightedVote.confidence) /
      agent.performance.totalVotes
    );
  }
  
  console.log(`🗳️ Vote cast: ${agentId} -> ${vote.decision} (weight: ${finalWeight.toFixed(3)})`);
}

// Risk assessment for proposals
function calculateRiskScore(proposal) {
  let risk = 0;
  
  // Route complexity risk
  risk += Math.max(0, (proposal.route.pools.length - 2) * 0.1);
  
  // Slippage risk
  risk += proposal.expectedSlippage || 0;
  
  // Gas volatility risk
  risk += (proposal.gasVolatility || 0) * 0.3;
  
  // Market condition risk
  risk += proposal.marketVolatility || 0;
  
  return Math.min(risk, 1.0); // Cap at 100%
}

// Enhanced consensus initiation
async function initiateConsensus(payload) {
  const decisionId = `decision_${++decisionCounter}`;
  const proposal = tradeProposals.get(payload.proposalId);
  
  if (!proposal) return;
  
  const decision = {
    id: decisionId,
    proposalId: payload.proposalId,
    proposal: proposal,
    votes: [],
    yesVotes: 0,
    noVotes: 0,
    weightedYes: 0,
    weightedNo: 0,
    totalWeight: 0,
    status: 'voting',
    createdAt: Date.now(),
    consensusThreshold: 0.67 // 67% weighted agreement
  };
  
  pendingDecisions.set(decisionId, decision);
  
  // Broadcast to all agents with proposal details
  broadcastToAgents({
    type: 'CONSENSUS_REQUEST',
    payload: {
      decisionId,
      proposal,
      deadline: Date.now() + 30000 // 30 second voting window
    }
  });
  
  console.log(`⚖️ Consensus initiated for Proposal #${payload.proposalId.substring(0,8)} (Score: ${proposal.compositeScore.toFixed(2)})`);
  
  // Evaluate consensus after voting period
  setTimeout(() => evaluateConsensus(decisionId), 30000);
}

// Enhanced consensus evaluation with weighted voting
function evaluateConsensus(decisionId) {
  const decision = pendingDecisions.get(decisionId);
  if (!decision) return;
  
  // Calculate weighted consensus
  const approvalRatio = decision.totalWeight > 0 ? 
    decision.weightedYes / decision.totalWeight : 0;
  
  const approved = approvalRatio >= decision.consensusThreshold;
  
  decision.status = 'completed';
  decision.finalResult = {
    approved,
    approvalRatio,
    yesVotes: decision.yesVotes,
    noVotes: decision.noVotes,
    totalVotes: decision.votes.length
  };
  
  // Update proposal status
  const proposal = tradeProposals.get(decision.proposalId);
  if (proposal) {
    proposal.status = approved ? 'approved' : 'rejected';
    proposal.consensusResult = decision.finalResult;
  }
  
  console.log(`📊 CONSENSUS RESULT: ${approved ? 'APPROVED' : 'REJECTED'} (${approvalRatio.toFixed(3)})`);
  
  // Broadcast final result
  broadcastToAgents({
    type: 'CONSENSUS_RESULT',
    payload: decision
  });
  
  pendingDecisions.delete(decisionId);
}

function broadcastToAgents(message) {
  const messageStr = JSON.stringify(message);
  for (const [agentId, agent] of agents) {
    if (agent.ws.readyState === 1) { // OPEN
      agent.ws.send(messageStr);
    }
  }
}

console.log('🚀 Enhanced Multi-Agent Consensus Hub ACTIVE on ws://localhost:8765');
console.log('🤖 Registered agents:', Array.from(agents.keys()));
console.log('⚖️ Enhanced consensus with profitability scoring and weighted voting');