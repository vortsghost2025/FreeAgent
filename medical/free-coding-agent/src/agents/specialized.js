/**
 * SPECIALIZED MEDICAL AGENTS
 *
 * Role-specific agent classes for medical coding ensemble:
 * - CodeGenerationAgent: Coding best practices, testing, refactoring
 * - DataEngineeringAgent: Schema compliance, data transformation, validation
 * - ClinicalAnalysisAgent: Clinical context, CDC/WHO guidelines, HIPAA
 *
 * Each agent enforces medical schemas from schemas.js
 */

import { CodingAgent } from "../agent.js";
import { ToolExecutor } from "../tools/index.js";
import { MedicalSchemaValidator } from "./medical-schema-validator.js";
import { createProvider } from "../providers/index.js";

// Agent Roles
export const AGENT_ROLES = {
  CODE_GENERATION: "code_generation",
  DATA_ENGINEERING: "data_engineering",
  CLINICAL_ANALYSIS: "clinical_analysis",
};

/**
 * Base Specialized Agent
 */
class BaseSpecializedAgent extends CodingAgent {
  constructor(config = {}) {
    super(config);

    this.role = config.role || "unknown";
    this.systemPrompt = config.systemPrompt || this.getDefaultSystemPrompt();
    this.schemaValidator = new MedicalSchemaValidator();

    // Override provider's system prompt
    if (this.provider) {
      this.provider.getSystemPrompt = () => this.systemPrompt;
    }
  }

  /**
   * Get default system prompt for role
   */
  getDefaultSystemPrompt() {
    return "You are a specialized medical coding agent.";
  }

  /**
   * Process message with schema validation
   */
  async *process(message) {
    let iteration = 0;
    this.conversationHistory.push({ role: "user", content: message });

    while (iteration < this.maxIterations) {
      iteration++;

      let response = "";

      for await (const chunk of this.provider.chatWithHistory(
        this.conversationHistory,
      )) {
        response += chunk;
        if (this.onResponse) {
          this.onResponse(chunk);
        }
        yield { type: "chunk", content: chunk };
      }

      // Add response to history
      this.conversationHistory.push({ role: "assistant", content: response });

      // Validate against medical schema (if applicable)
      const validationResult = this.validateResponse(response);
      if (!validationResult.valid) {
        yield {
          type: "schema_warning",
          agentRole: this.role,
          warnings: validationResult.errors,
        };
      }

      // Check for tool calls
      if (!this.executor.hasTools(response)) {
        yield { type: "complete", content: response };
        return;
      }

      // Execute tools
      const toolResults = [];

      for await (const {
        tool,
        params,
        result,
      } of this.executor.parseAndExecute(response)) {
        if (this.onToolCall) {
          this.onToolCall(tool, params, result);
        }

        yield { type: "tool", tool, params, result };

        if (result.requiresApproval) {
          yield { type: "approval_required", tool, params };
          return;
        }

        if (result.requiresInput) {
          yield { type: "input_required", question: result.question };
          return;
        }

        toolResults.push({ tool, params, result });
      }

      const toolResultMessage = this.formatToolResults(toolResults);
      this.conversationHistory.push({
        role: "user",
        content: toolResultMessage,
      });
    }

    yield { type: "max_iterations", message: "Maximum iterations reached" };
  }

  /**
   * Validate agent response
   */
  validateResponse(response) {
    return this.schemaValidator.validate(response, this.role);
  }
}

/**
 * Code Generation Agent
 *
 * Specializes in:
 * - Writing and modifying code
 * - Coding best practices
 * - Testing and TDD
 * - Refactoring
 */
export class CodeGenerationAgent extends BaseSpecializedAgent {
  constructor(config = {}) {
    super({
      ...config,
      role: AGENT_ROLES.CODE_GENERATION,
      systemPrompt: config.systemPrompt || this.getSystemPrompt(),
    });
  }

  getSystemPrompt() {
    return `You are a medical coding specialist focused on writing and modifying code.

Your expertise includes:
- Coding best practices and patterns
- Testing and test-driven development
- Refactoring and code quality
- Medical API implementation
- Serverless function development
- Data processing pipelines

Available tools: read_file, write_to_file, replace_in_file, list_files, search_files, execute_command, ask_followup_question

Guidelines:
1. Always read files before modifying them
2. Write tests for new functionality
3. Follow existing code style and patterns
4. Validate against medical schemas when relevant
5. Prioritize safety and HIPAA compliance

Medical Schema Awareness:
- Use schemas.js definitions for data structures
- Ensure API responses match SummarySchema, RiskScoreSchema
- Validate inputs against RawInputSchema patterns
- Maintain FinalOutputSchema structure in outputs`;
  }

  getDefaultSystemPrompt() {
    return this.getSystemPrompt();
  }

  /**
   * Get capabilities for this agent
   */
  getCapabilities() {
    return [
      "code_generation",
      "code_refactoring",
      "testing",
      "api_development",
      "file_operations",
      "command_execution",
    ];
  }
}

/**
 * Data Engineering Agent
 *
 * Specializes in:
 * - Schema design and validation
 * - Data transformation and ETL
 * - JSON structure manipulation
 * - Medical data standards
 */
export class DataEngineeringAgent extends BaseSpecializedAgent {
  constructor(config = {}) {
    super({
      ...config,
      role: AGENT_ROLES.DATA_ENGINEERING,
      systemPrompt: config.systemPrompt || this.getSystemPrompt(),
    });
  }

  getSystemPrompt() {
    return `You are a data engineering specialist focused on medical data validation and transformation.

Your expertise includes:
- Schema design and validation
- Data transformation and ETL
- JSON structure manipulation
- Medical data standards (HL7, FHIR)
- Data quality checks
- Pipeline optimization

Available tools: read_file, write_to_file, replace_in_file, list_files, search_files, execute_command, ask_followup_question

Guidelines:
1. Enforce medical data schemas from schemas.js
2. Validate data integrity before processing
3. Handle edge cases gracefully
4. Maintain audit trails for data changes
5. Document transformation rules

Medical Schema Enforcement:
- RawInputSchema: Validate raw input structure
- NormalizedDataSchema: Ensure proper normalization
- ClassificationSchema: Validate classification outputs
- SummarySchema: Enforce field structure and types
- RiskScoreSchema: Validate risk score format
- FinalOutputSchema: Ensure complete output structure

Schema Compliance Rules:
- All timestamps must be ISO8601 format
- Required fields must not be null/undefined
- Arrays must contain valid items
- Nested objects must match schema structure`;
  }

  getDefaultSystemPrompt() {
    return this.getSystemPrompt();
  }

  /**
   * Get capabilities for this agent
   */
  getCapabilities() {
    return [
      "data_validation",
      "schema_design",
      "data_transformation",
      "etl_pipelines",
      "quality_checks",
      "audit_trails",
    ];
  }
}

/**
 * Clinical Analysis Agent
 *
 * Specializes in:
 * - Clinical context interpretation
 * - Symptom and condition analysis
 * - CDC/WHO guideline compliance
 * - Medical terminology
 */
export class ClinicalAnalysisAgent extends BaseSpecializedAgent {
  constructor(config = {}) {
    super({
      ...config,
      role: AGENT_ROLES.CLINICAL_ANALYSIS,
      systemPrompt: config.systemPrompt || this.getSystemPrompt(),
    });
  }

  getSystemPrompt() {
    return `You are a clinical analysis specialist with expertise in medical reasoning and CDC/WHO guidelines.

Your expertise includes:
- Clinical context interpretation
- Symptom and condition analysis
- CDC/WHO guideline compliance
- Medical terminology
- Risk assessment
- HIPAA privacy considerations

Available tools: read_file, write_to_file, list_files, search_files, ask_followup_question

Guidelines:
1. Validate inputs against medical schemas
2. Reference CDC/WHO guidelines when applicable
3. Maintain patient privacy (HIPAA)
4. Provide clear, evidence-based recommendations
5. Flag uncertain findings for human review

Clinical Analysis Standards:
- Use proper medical terminology
- Consider CDC/WHO classifications
- Assess symptom severity based on clinical criteria
- Identify potential risk factors (structural only, no clinical judgment)
- Reference relevant medical literature when available

Medical Schema Usage:
- ClassificationSchema: Classify input type (symptoms, notes, labs, imaging, vitals)
- SummarySchema: Extract structured fields from clinical text
- RiskScoreSchema: Calculate structural risk scores
- FinalOutputSchema: Format clinical analysis results

Privacy and Compliance:
- Never output identifiable patient information
- Redact PHI when summarizing notes
- Follow HIPAA minimum necessary standard
- Document all redactions in FinalOutputSchema`;
  }

  getDefaultSystemPrompt() {
    return this.getSystemPrompt();
  }

  /**
   * Get capabilities for this agent
   */
  getCapabilities() {
    return [
      "clinical_analysis",
      "symptom_classification",
      "guideline_compliance",
      "medical_terminology",
      "privacy_compliance",
      "risk_assessment",
    ];
  }
}

/**
 * Agent Factory
 */
export class AgentFactory {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Create an agent by role
   */
  createAgent(role, agentConfig = {}) {
    const mergedConfig = { ...this.config, ...agentConfig, role };

    switch (role) {
      case AGENT_ROLES.CODE_GENERATION:
        return new CodeGenerationAgent(mergedConfig);
      case AGENT_ROLES.DATA_ENGINEERING:
        return new DataEngineeringAgent(mergedConfig);
      case AGENT_ROLES.CLINICAL_ANALYSIS:
        return new ClinicalAnalysisAgent(mergedConfig);
      default:
        throw new Error(`Unknown agent role: ${role}`);
    }
  }

  /**
   * Create all default agents
   */
  createDefaultAgents() {
    const agents = [];

    for (const role of Object.values(AGENT_ROLES)) {
      const agent = this.createAgent(role);
      agents.push(agent);
    }

    return agents;
  }

  /**
   * List available agent roles
   */
  listRoles() {
    return Object.values(AGENT_ROLES);
  }

  /**
   * Get agent class by role
   */
  getAgentClass(role) {
    switch (role) {
      case AGENT_ROLES.CODE_GENERATION:
        return CodeGenerationAgent;
      case AGENT_ROLES.DATA_ENGINEERING:
        return DataEngineeringAgent;
      case AGENT_ROLES.CLINICAL_ANALYSIS:
        return ClinicalAnalysisAgent;
      default:
        throw new Error(`Unknown agent role: ${role}`);
    }
  }
}

// Export factory function
export function createSpecializedAgent(role, config = {}) {
  const factory = new AgentFactory(config);
  return factory.createAgent(role);
}
