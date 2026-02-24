import { StandardAgent } from "./standard-agent.js";

export class ApiAgent extends StandardAgent {
  constructor() {
    super({
      name: "api",
      role: "API Agent",
      description:
        "Handles API design, OpenAPI specs, and integration patterns.",
      model: "llama3.2",
      tools: [],
      memoryPath: "memory/agents/api.json",
    });
  }
}
