import { StandardAgent } from "./standard-agent.js";

export class DbAgent extends StandardAgent {
  constructor(model = null) {
    super({
      name: "db",
      role: "Database Agent",
      description: "Handles SQL, schema design, migrations, and optimization.",
      model: model,
      tools: [],
      memoryPath: "memory/agents/db.json",
    });
  }
}
