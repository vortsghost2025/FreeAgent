import { StandardAgent } from "./standard-agent.js";

export class SecurityAgent extends StandardAgent {
  constructor(model = null) {
    super({
      name: "security",
      role: "Security Agent",
      description:
        "Handles security review, vulnerability checks, and threat modeling.",
      model: model,
      tools: [],
      memoryPath: "memory/agents/security.json",
    });
  }
}
