import { StandardAgent } from "./standard-agent.js";

export class DataAgent extends StandardAgent {
  constructor() {
    super({
      name: "data",
      role: "Data Agent",
      description:
        "Handles data validation, transformation, querying, and analysis.",
      model: "llama3.2",
      tools: [],
      memoryPath: "memory/agents/data.json",
    });
  }
}
