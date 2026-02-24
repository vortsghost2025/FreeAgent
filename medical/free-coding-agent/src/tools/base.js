/**
 * Base Tool Interface
 */
export class BaseTool {
  constructor(config = {}) {
    this.config = config;
    this.name = "base";
    this.description = "Base tool class";
  }

  /**
   * Execute the tool with parsed parameters
   * @param {object} params - Parsed parameters from XML
   * @returns {Promise<object>} - Result object with success, output, error
   */
  async execute(params) {
    throw new Error("execute() must be implemented by subclass");
  }

  /**
   * Get the XML schema for this tool
   */
  getSchema() {
    return {
      name: this.name,
      description: this.description,
      parameters: {},
    };
  }
}
