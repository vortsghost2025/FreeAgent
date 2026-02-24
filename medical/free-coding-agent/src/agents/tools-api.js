export const API_TOOLS = {
  generate_openapi: {
    name: "generate_openapi",
    description: "Generate OpenAPI specification",
    parameters: {
      sourceCode: { type: "string" },
      version: { type: "string", enum: ["3.0", "3.1"] },
      outputFormat: { type: "string", enum: ["json", "yaml"] },
    },
    execute: async (params) => {
      console.log(
        `[generate_openapi] Generating OpenAPI ${params.version} spec (${params.outputFormat})`,
      );
      return { success: true, output: "OpenAPI spec generated" };
    },
  },
  create_api_client: {
    name: "create_api_client",
    description: "Generate API client code",
    parameters: {
      specFile: { type: "string" },
      language: {
        type: "string",
        enum: ["typescript", "javascript", "python", "go"],
      },
      library: { type: "string" },
    },
    execute: async (params) => {
      console.log(
        `[create_api_client] Generating ${params.language} client from ${params.specFile}`,
      );
      return { success: true, output: "API client generated" };
    },
  },
  mock_server: {
    name: "mock_server",
    description: "Generate mock API server",
    parameters: {
      specFile: { type: "string" },
      port: { type: "number" },
    },
    execute: async (params) => {
      console.log(`[mock_server] Creating mock server on port ${params.port}`);
      return { success: true, output: "Mock server generated" };
    },
  },
};
