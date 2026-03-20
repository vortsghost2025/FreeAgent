const { computeStress } = require("./stress");
const { rollingCleanup } = require("./cleanup");
const { getSystemSnapshot } = require("../metrics");

class AdaptiveRuntime {
  constructor(agent) {
    this.agent = agent;
  }

  async tick(task) {
    // get real system metrics
    const snapshot = await getSystemSnapshot();

    // compute stress score
    const stress = computeStress(snapshot);

    // run the agent with stress context and agent selection
    const result = await this.agent.run(task, {
      stress: stress.score,
      agent: task.agent // Pass agent selection to router
    });

    // trigger cleanup if needed
    if (stress.score > 0.6) {
      rollingCleanup();
    }

    return { result, stress, snapshot };
  }
}

module.exports = AdaptiveRuntime;
