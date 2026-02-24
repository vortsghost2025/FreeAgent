/*
  File: agent-registry.js
  Description: Registers all 8 agents using StandardAgent.
*/

import { CodeAgent } from "./agents/code-agent.js";
import { DataAgent } from "./agents/data-agent.js";
import { ClinicalAgent } from "./agents/clinical-agent.js";
import { TestAgent } from "./agents/test-agent.js";
import { SecurityAgent } from "./agents/security-agent.js";
import { ApiAgent } from "./agents/api-agent.js";
import { DbAgent } from "./agents/db-agent.js";
import { DevOpsAgent } from "./agents/devops-agent.js";

export function loadAgents() {
  return {
    code: new CodeAgent(),
    data: new DataAgent(),
    clinical: new ClinicalAgent(),
    test: new TestAgent(),
    security: new SecurityAgent(),
    api: new ApiAgent(),
    db: new DbAgent(),
    devops: new DevOpsAgent()
  };
}
