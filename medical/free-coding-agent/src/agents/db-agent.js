import { StandardAgent } from "./standard-agent.js";

export class DbAgent extends StandardAgent {
  constructor() {
    super({
      name: "db",
      role: "Database Agent",
      description: "Handles SQL, schema design, migrations, and optimization.",
      model: "llama3.2",
      tools: [],
      memoryPath: "memory/agents/db.json",
    });
  }
}
