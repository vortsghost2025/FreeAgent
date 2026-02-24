import { StandardAgent } from "./standard-agent.js";

export class CodeAgent extends StandardAgent {
  constructor(model = null) {
    super({
      name: "code",
      role: "Code Agent",
      description:
        "Handles programming, debugging, refactoring, and code generation.",
      model: model,
      tools: [],
      memoryPath: "memory/agents/code.json",
    });
  }
}
