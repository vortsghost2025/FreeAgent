import { StandardAgent } from "./standard-agent.js";

export class TestAgent extends StandardAgent {
  constructor() {
    super({
      name: "test",
      role: "Test Agent",
      description: "Handles test generation, coverage, and validation.",
      model: "llama3.2",
      tools: [],
      memoryPath: "memory/agents/test.json",
    });
  }
}
