import { BaseTool } from "./base.js";
import fs from "fs/promises";
import path from "path";

export class WriteFileTool extends BaseTool {
  constructor(config = {}) {
    super(config);
    this.name = "write_to_file";
    this.description = "Write content to a file (creates or overwrites)";
    this.workingDir = config.workingDir || process.cwd();
  }

  async execute(params) {
    try {
      if (!params.path) {
        return { success: false, error: "Missing required parameter: path" };
      }
      if (params.content === undefined) {
        return { success: false, error: "Missing required parameter: content" };
      }

      const filePath = path.resolve(this.workingDir, params.path);

      // Security check
      if (!filePath.startsWith(path.resolve(this.workingDir))) {
        return {
          success: false,
          error: "Access denied: path outside working directory",
        };
      }

      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(filePath, params.content, "utf-8");

      return {
        success: true,
        output: `File written successfully: ${params.path}`,
        path: params.path,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getSchema() {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        path: {
          type: "string",
          required: true,
          description: "Path to the file to write",
        },
        content: {
          type: "string",
          required: true,
          description: "Content to write to the file",
        },
      },
    };
  }
}
