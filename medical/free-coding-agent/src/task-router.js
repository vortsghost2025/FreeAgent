/*
  File: task-router.js
  Description: Routes tasks to selected agents using local-first logic.
*/

export class TaskRouter {
  constructor(agents, provider, memory) {
    this.agents = agents;
    this.provider = provider;
    this.memory = memory;
  }

  async route(message, selectedAgents) {
    const active = selectedAgents.length > 0
      ? selectedAgents
      : Object.keys(this.agents);

    const results = [];

    for (const name of active) {
      const agent = this.agents[name];
      const response = await agent.handleMessage(message, this.provider);

      results.push({
        agent: name,
        response: response.content,
        timestamp: Date.now()
      });
    }

    return results;
  }
}
