import { StandardAgent } from "./standard-agent.js";

export class DevOpsAgent extends StandardAgent {
  constructor() {
    super({
      name: "devops",
      role: "DevOps Agent",
      description: "Handles Docker, CI/CD, deployment, and infra.",
      model: "llama3.2",
      tools: [],
      memoryPath: "memory/agents/devops.json",
    });
  }
}
