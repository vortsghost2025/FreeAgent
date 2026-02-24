import { BaseTool } from "./base.js";
import fs from "fs/promises";
import path from "path";

export class ReplaceInFileTool extends BaseTool {
  constructor(config = {}) {
    super(config);
    this.name = "replace_in_file";
    this.description = "Replace specific content in a file";
    this.workingDir = config.workingDir || process.cwd();
  }

  async execute(params) {
    try {
      if (!params.path) {
        return { success: false, error: "Missing required parameter: path" };
      }
      if (!params.diff) {
        return { success: false, error: "Missing required parameter: diff" };
      }

      const filePath = path.resolve(this.workingDir, params.path);

      // Security check
      if (!filePath.startsWith(path.resolve(this.workingDir))) {
        return {
          success: false,
          error: "Access denied: path outside working directory",
        };
      }

      // Read current content
      let content = await fs.readFile(filePath, "utf-8");

      // Parse the diff format
      const searchMatch = params.diff.match(
        /-------\s*SEARCH\s*([\s\S]*?)\s*======\s*([\s\S]*?)\s*\+\+\+\+\+\+\+\s*REPLACE/,
      );

      if (!searchMatch) {
        return {
          success: false,
          error:
            "Invalid diff format. Expected: ------- SEARCH [content] ======= [new content] +++++++ REPLACE",
        };
      }

      const searchContent = searchMatch[1];
      const replaceContent = searchMatch[2];

      // Check if search content exists
      if (!content.includes(searchContent)) {
        return {
          success: false,
          error:
            "Search content not found in file. Make sure the content matches exactly.",
        };
      }

      // Perform replacement
      const newContent = content.replace(searchContent, replaceContent);

      await fs.writeFile(filePath, newContent, "utf-8");

      return {
        success: true,
        output: `Content replaced successfully in: ${params.path}`,
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
          description: "Path to the file",
        },
        diff: {
          type: "string",
          required: true,
          description: "Diff with SEARCH and REPLACE blocks",
        },
      },
    };
  }
}
