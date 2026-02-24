import { StandardAgent } from "./standard-agent.js";

export class DevOpsAgent extends StandardAgent {
  constructor(model = null) {
    super({
      name: "devops",
      role: "DevOps Agent",
      description: "Handles Docker, CI/CD, deployment, and infra.",
      model: model,
      tools: [],
      memoryPath: "memory/agents/devops.json",
    });
  }
}
