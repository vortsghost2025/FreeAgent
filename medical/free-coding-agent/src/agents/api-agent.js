import { StandardAgent } from "./standard-agent.js";

export class ApiAgent extends StandardAgent {
  constructor(model = null) {
    super({
      name: "api",
      role: "API Agent",
      description:
        "Handles API design, OpenAPI specs, and integration patterns.",
      model: model,
      tools: [],
      memoryPath: "memory/agents/api.json",
    });
  }
}
