import { StandardAgent } from "./standard-agent.js";

export class TestAgent extends StandardAgent {
  constructor(model = null) {
    super({
      name: "test",
      role: "Test Agent",
      description: "Handles test generation, coverage, and validation.",
      model: model,
      tools: [],
      memoryPath: "memory/agents/test.json",
    });
  }
}
