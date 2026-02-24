import { StandardAgent } from "./standard-agent.js";

export class ClinicalAgent extends StandardAgent {
  constructor() {
    super({
      name: "clinical",
      role: "Clinical Agent",
      description:
        "Handles clinical reasoning, workflows, terminology, and structured outputs.",
      model: "llama3.2",
      tools: [],
      memoryPath: "memory/agents/clinical.json",
    });
  }
}
