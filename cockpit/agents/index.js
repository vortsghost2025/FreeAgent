/**
 * Cockpit Agents Index
 * 
 * Exports all agents and capabilities for the FreeAgent Cockpit
 */

const BaseAgent = require('./baseAgent');
const RouterAgent = require('./routerAgent');
const { AgentCapabilities, createCapabilitiesMiddleware } = require('./agentCapabilities');

module.exports = {
  // Agents
  BaseAgent,
  RouterAgent,
  
  // Capabilities
  AgentCapabilities,
  createCapabilitiesMiddleware
};
