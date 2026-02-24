import { StandardAgent } from "./standard-agent.js";

export class ClinicalAgent extends StandardAgent {
  constructor(model = null) {
    super({
      name: "clinical",
      role: "Clinical Agent",
      description:
        "Handles clinical reasoning, workflows, terminology, and structured outputs.",
      model: model,
      tools: [],
      memoryPath: "memory/agents/clinical.json",
    });
  }
}
