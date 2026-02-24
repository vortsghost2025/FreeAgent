import { BaseTool } from "./base.js";
import fs from "fs/promises";
import path from "path";

export class ListFilesTool extends BaseTool {
  constructor(config = {}) {
    super(config);
    this.name = "list_files";
    this.description = "List files in a directory";
    this.workingDir = config.workingDir || process.cwd();
  }

  async execute(params) {
    try {
      if (!params.path) {
        return { success: false, error: "Missing required parameter: path" };
      }

      const dirPath = path.resolve(this.workingDir, params.path);

      // Security check
      if (!dirPath.startsWith(path.resolve(this.workingDir))) {
        return {
          success: false,
          error: "Access denied: path outside working directory",
        };
      }

      const recursive =
        params.recursive === "true" || params.recursive === true;

      const files = await this.listDirectory(dirPath, recursive);

      return {
        success: true,
        output: files.join("\n"),
        files,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.code === "ENOENT"
            ? `Directory not found: ${params.path}`
            : error.message,
      };
    }
  }

  async listDirectory(dir, recursive) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(this.workingDir, fullPath);

      if (entry.isDirectory()) {
        files.push(`${relativePath}/`);
        if (recursive) {
          const subFiles = await this.listDirectory(fullPath, recursive);
          files.push(...subFiles);
        }
      } else {
        files.push(relativePath);
      }
    }

    return files.sort();
  }

  getSchema() {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        path: {
          type: "string",
          required: true,
          description: "Directory path to list",
        },
        recursive: {
          type: "boolean",
          required: false,
          description: "List recursively",
        },
      },
    };
  }
}
