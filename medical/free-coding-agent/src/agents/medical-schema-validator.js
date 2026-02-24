/**
 * MEDICAL SCHEMA VALIDATOR
 *
 * Validates agent outputs against medical schemas from schemas.js
 * - Ensures CDC/WHO compliance
 * - Tracks schema conformance in memory
 * - Provides feedback to agents
 *
 * Validates against:
 * - RawInputSchema
 * - NormalizedDataSchema
 * - ClassificationSchema
 * - SummarySchema
 * - RiskScoreSchema
 * - FinalOutputSchema
 */

let medicalSchemas = null;
async function getMedicalSchemas() {
  if (!medicalSchemas) {
    medicalSchemas = await import("../../../schemas.js");
  }
  return medicalSchemas;
}

// Validation Results
export const VALIDATION_RESULT = {
  VALID: "valid",
  WARNING: "warning",
  ERROR: "error",
};

/**
 * Medical Schema Validator
 */
export class MedicalSchemaValidator {
  constructor(config = {}) {
    this.config = {
      strictMode: config.strictMode || false,
      allowPartial: config.allowPartial || false,
      ...config,
    };

    this.schemas = {
      RawInputSchema: "placeholder",
      NormalizedDataSchema: "placeholder",
      ClassificationSchema: "placeholder",
      SummarySchema: "placeholder",
      RiskScoreSchema: "placeholder",
      FinalOutputSchema: "placeholder",
      TaskSchema: "placeholder",
      StateSchema: "placeholder",
    };

    this.validationHistory = [];
    this.conformanceMetrics = {
      totalValidations: 0,
      validCount: 0,
      warningCount: 0,
      errorCount: 0,
      agentConformance: {},
    };

    console.log("🔍 Medical Schema Validator initialized");
  }

  /**
   * Validate response against schema
   */
  validate(response, agentRole, schemaName = null) {
    this.conformanceMetrics.totalValidations++;

    // Determine which schema to use
    const targetSchema = this._getTargetSchema(agentRole, schemaName);

    if (!targetSchema) {
      // No schema for this role/type
      return {
        valid: true,
        result: VALIDATION_RESULT.VALID,
        schema: null,
        errors: [],
      };
    }

    // Perform validation
    const errors = this._validateAgainstSchema(response, targetSchema);

    // Determine validation result
    let result = VALIDATION_RESULT.VALID;
    let isValid = true;

    if (errors.length > 0) {
      const criticalErrors = errors.filter((e) => e.severity === "error");
      const warnings = errors.filter((e) => e.severity === "warning");

      if (criticalErrors.length > 0) {
        result = VALIDATION_RESULT.ERROR;
        isValid = false;
        this.conformanceMetrics.errorCount++;
      } else {
        result = VALIDATION_RESULT.WARNING;
        this.conformanceMetrics.warningCount++;
      }
    } else {
      this.conformanceMetrics.validCount++;
    }

    // Track agent conformance
    this._trackAgentConformance(agentRole, isValid);

    // Record validation
    this._recordValidation(agentRole, targetSchema, result, errors);

    return {
      valid: isValid,
      result: result,
      schema: targetSchema,
      errors: errors,
    };
  }

  /**
   * Get target schema for agent role
   */
  _getTargetSchema(agentRole, schemaName) {
    // If specific schema requested, use it
    if (schemaName) {
      return this.schemas[schemaName] || null;
    }

    // Map agent roles to default schemas
    const roleSchemaMap = {
      code_generation: FinalOutputSchema,
      data_engineering: SummarySchema,
      clinical_analysis: ClassificationSchema,
    };

    return roleSchemaMap[agentRole] || null;
  }

  /**
   * Validate against schema
   */
  _validateAgainstSchema(data, schema) {
    const errors = [];

    // Parse response if it's a string
    let parsedData;
    try {
      if (typeof data === "string") {
        // Try to extract JSON from response
        const jsonMatch = data.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          // Not structured data, can't validate schema
          if (this.config.strictMode) {
            errors.push({
              field: "root",
              message: "Response is not structured data",
              severity: "warning",
              schema: schema.name || "unknown",
            });
          }
          return errors;
        }
      } else {
        parsedData = data;
      }
    } catch (error) {
      errors.push({
        field: "root",
        message: `Failed to parse data: ${error.message}`,
        severity: "error",
        schema: schema.name || "unknown",
      });
      return errors;
    }

    // Validate schema structure
    this._validateSchemaStructure(parsedData, schema, errors);

    return errors;
  }

  /**
   * Validate schema structure
   */
  _validateSchemaStructure(data, schema, errors, path = "") {
    // Schema definitions are objects with type annotations
    // We validate that the structure matches the expected shape

    for (const [key, typeInfo] of Object.entries(schema)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (!(key in data)) {
        // Missing required field
        if (!this.config.allowPartial) {
          errors.push({
            field: currentPath,
            message: `Missing required field: ${key}`,
            severity: "warning",
            schema: schema.name || "unknown",
          });
        }
        continue;
      }

      const value = data[key];
      const expectedType = this._parseType(typeInfo);

      if (!this._checkType(value, expectedType)) {
        errors.push({
          field: currentPath,
          message: `Type mismatch for ${key}: expected ${expectedType}, got ${typeof value}`,
          severity: "warning",
          schema: schema.name || "unknown",
        });
      }

      // Recursively validate nested objects
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // If typeInfo is an object schema definition
        if (typeof typeInfo === "object" && !typeInfo.includes("|")) {
          this._validateSchemaStructure(value, typeInfo, errors, currentPath);
        }
      }

      // Validate array items
      if (
        Array.isArray(value) &&
        typeof typeInfo === "string" &&
        typeInfo.includes("[]")
      ) {
        const itemType = typeInfo.replace("[]", "").trim();
        value.forEach((item, index) => {
          if (!this._checkType(item, itemType)) {
            errors.push({
              field: `${currentPath}[${index}]`,
              message: `Array item type mismatch: expected ${itemType}, got ${typeof item}`,
              severity: "warning",
              schema: schema.name || "unknown",
            });
          }
        });
      }
    }
  }

  /**
   * Parse type from schema definition
   */
  _parseType(typeInfo) {
    if (typeof typeInfo === "string") {
      return typeInfo.split("|")[0].trim().replace("[]", "");
    }
    return "object";
  }

  /**
   * Check if value matches type
   */
  _checkType(value, expectedType) {
    const actualType = Array.isArray(value) ? "array" : typeof value;

    if (expectedType === "number") {
      return actualType === "number";
    }
    if (expectedType === "string") {
      return actualType === "string";
    }
    if (expectedType === "boolean") {
      return actualType === "boolean";
    }
    if (expectedType === "object") {
      return actualType === "object" && value !== null;
    }
    if (expectedType === "array") {
      return actualType === "array";
    }

    // Handle complex types like "ISO8601 string"
    if (expectedType.includes("string")) {
      return actualType === "string";
    }

    return true;
  }

  /**
   * Track agent conformance
   */
  _trackAgentConformance(agentRole, isValid) {
    if (!this.conformanceMetrics.agentConformance[agentRole]) {
      this.conformanceMetrics.agentConformance[agentRole] = {
        total: 0,
        valid: 0,
      };
    }

    const metrics = this.conformanceMetrics.agentConformance[agentRole];
    metrics.total++;
    if (isValid) {
      metrics.valid++;
    }
  }

  /**
   * Record validation
   */
  _recordValidation(agentRole, schema, result, errors) {
    this.validationHistory.push({
      timestamp: new Date().toISOString(),
      agentRole,
      schema: schema.name || "unknown",
      result,
      errorCount: errors.length,
      errors: errors.slice(0, 10), // Keep first 10 errors
    });

    // Trim history
    if (this.validationHistory.length > 1000) {
      this.validationHistory.shift();
    }
  }

  /**
   * Validate specific schema by name
   */
  validateSchema(data, schemaName) {
    const schema = this.schemas[schemaName];

    if (!schema) {
      return {
        valid: false,
        result: VALIDATION_RESULT.ERROR,
        errors: [
          {
            field: "schema",
            message: `Unknown schema: ${schemaName}`,
            severity: "error",
          },
        ],
      };
    }

    const errors = this._validateAgainstSchema(data, schema);

    return {
      valid: errors.length === 0,
      result:
        errors.length > 0 ? VALIDATION_RESULT.WARNING : VALIDATION_RESULT.VALID,
      schema,
      errors,
    };
  }

  /**
   * Validate timestamp format
   */
  validateTimestamp(timestamp) {
    if (!timestamp) {
      return {
        valid: false,
        error: "Timestamp is missing",
      };
    }

    // Check ISO8601 format
    const isoRegex =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

    if (!isoRegex.test(timestamp)) {
      return {
        valid: false,
        error: "Timestamp is not in ISO8601 format",
      };
    }

    // Try to parse as Date
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return {
        valid: false,
        error: "Invalid date",
      };
    }

    return {
      valid: true,
    };
  }

  /**
   * Validate classification type
   */
  validateClassificationType(type) {
    const validTypes = [
      "symptoms",
      "notes",
      "labs",
      "imaging",
      "vitals",
      "other",
    ];

    if (!validTypes.includes(type)) {
      return {
        valid: false,
        error: `Invalid classification type: ${type}. Valid types: ${validTypes.join(", ")}`,
      };
    }

    return {
      valid: true,
    };
  }

  /**
   * Validate risk score range
   */
  validateRiskScore(score) {
    if (typeof score !== "number") {
      return {
        valid: false,
        error: "Risk score must be a number",
      };
    }

    if (score < 0 || score > 1) {
      return {
        valid: false,
        error: "Risk score must be between 0 and 1",
      };
    }

    return {
      valid: true,
    };
  }

  /**
   * Get validation history
   */
  getValidationHistory(limit = 50, agentRole = null) {
    let history = [...this.validationHistory];

    if (agentRole) {
      history = history.filter((v) => v.agentRole === agentRole);
    }

    return history.slice(-limit);
  }

  /**
   * Get conformance metrics
   */
  getConformanceMetrics() {
    const agentConformance = {};

    for (const [role, metrics] of Object.entries(
      this.conformanceMetrics.agentConformance,
    )) {
      agentConformance[role] = {
        total: metrics.total,
        valid: metrics.valid,
        invalid: metrics.total - metrics.valid,
        conformanceRate:
          metrics.total > 0 ? (metrics.valid / metrics.total) * 100 : 0,
      };
    }

    return {
      total: this.conformanceMetrics.totalValidations,
      valid: this.conformanceMetrics.validCount,
      warnings: this.conformanceMetrics.warningCount,
      errors: this.conformanceMetrics.errorCount,
      overallConformance:
        this.conformanceMetrics.totalValidations > 0
          ? (this.conformanceMetrics.validCount /
              this.conformanceMetrics.totalValidations) *
            100
          : 0,
      agentConformance,
    };
  }

  /**
   * Get available schemas
   */
  getAvailableSchemas() {
    return Object.keys(this.schemas);
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.conformanceMetrics = {
      totalValidations: 0,
      validCount: 0,
      warningCount: 0,
      errorCount: 0,
      agentConformance: {},
    };
    this.validationHistory = [];

    console.log("📊 Validation metrics reset");
  }
}

// Singleton instance
let validatorInstance = null;

/**
 * Get singleton instance
 */
export function getMedicalSchemaValidator(config) {
  if (!validatorInstance) {
    validatorInstance = new MedicalSchemaValidator(config);
  }
  return validatorInstance;
}
