import { StandardAgent } from "./standard-agent.js";

export class DataAgent extends StandardAgent {
  constructor(model = null) {
    super({
      name: "data",
      role: "Data Agent",
      description:
        "Handles data validation, transformation, querying, and analysis.",
      model: model,
      tools: [],
      memoryPath: "memory/agents/data.json",
    });
  }
}
