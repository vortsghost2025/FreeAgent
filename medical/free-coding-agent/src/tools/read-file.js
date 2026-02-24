import { BaseTool } from "./base.js";
import fs from "fs/promises";
import path from "path";

export class ReadFileTool extends BaseTool {
  constructor(config = {}) {
    super(config);
    this.name = "read_file";
    this.description = "Read the contents of a file";
    this.workingDir = config.workingDir || process.cwd();
  }

  async execute(params) {
    try {
      if (!params.path) {
        return { success: false, error: "Missing required parameter: path" };
      }

      const filePath = path.resolve(this.workingDir, params.path);

      // Security check - ensure path is within working directory
      if (!filePath.startsWith(path.resolve(this.workingDir))) {
        return {
          success: false,
          error: "Access denied: path outside working directory",
        };
      }

      const content = await fs.readFile(filePath, "utf-8");
      return {
        success: true,
        output: content,
        path: params.path,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.code === "ENOENT"
            ? `File not found: ${params.path}`
            : error.message,
      };
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
          description: "Path to the file to read",
        },
      },
    };
  }
}
