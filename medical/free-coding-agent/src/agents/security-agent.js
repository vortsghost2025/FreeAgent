import { StandardAgent } from "./standard-agent.js";

export class SecurityAgent extends StandardAgent {
  constructor() {
    super({
      name: "security",
      role: "Security Agent",
      description:
        "Handles security review, vulnerability checks, and threat modeling.",
      model: "llama3.2",
      tools: [],
      memoryPath: "memory/agents/security.json",
    });
  }
}
