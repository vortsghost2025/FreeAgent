import { StandardAgent } from "./standard-agent.js";

export class CodeAgent extends StandardAgent {
  constructor() {
    super({
      name: "code",
      role: "Code Agent",
      description:
        "Handles programming, debugging, refactoring, and code generation.",
      model: "llama3.2",
      tools: [],
      memoryPath: "memory/agents/code.json",
    });
  }
}
