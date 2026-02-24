import { BaseTool } from "./base.js";
import fs from "fs/promises";
import path from "path";

export class SearchFilesTool extends BaseTool {
  constructor(config = {}) {
    super(config);
    this.name = "search_files";
    this.description = "Search for a regex pattern in files";
    this.workingDir = config.workingDir || process.cwd();
  }

  async execute(params) {
    try {
      if (!params.path) {
        return { success: false, error: "Missing required parameter: path" };
      }
      if (!params.regex) {
        return { success: false, error: "Missing required parameter: regex" };
      }

      const dirPath = path.resolve(this.workingDir, params.path);

      // Security check
      if (!dirPath.startsWith(path.resolve(this.workingDir))) {
        return {
          success: false,
          error: "Access denied: path outside working directory",
        };
      }

      let regex;
      try {
        regex = new RegExp(params.regex, "gm");
      } catch (e) {
        return { success: false, error: `Invalid regex: ${e.message}` };
      }

      const results = await this.searchDirectory(
        dirPath,
        regex,
        params.filePattern,
      );

      if (results.length === 0) {
        return {
          success: true,
          output: "No matches found.",
          results: [],
        };
      }

      const output = results
        .map((r) => `${r.file}:${r.lineNumber}: ${r.line.trim()}`)
        .join("\n");

      return {
        success: true,
        output,
        results,
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

  async searchDirectory(dir, regex, filePattern) {
    const results = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const pattern = filePattern ? new RegExp(filePattern) : null;

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const subResults = await this.searchDirectory(
          fullPath,
          regex,
          filePattern,
        );
        results.push(...subResults);
      } else if (entry.isFile()) {
        // Check file pattern
        if (pattern && !pattern.test(entry.name)) {
          continue;
        }

        // Skip binary files
        if (this.isBinaryFile(entry.name)) {
          continue;
        }

        try {
          const content = await fs.readFile(fullPath, "utf-8");
          const lines = content.split("\n");

          lines.forEach((line, index) => {
            const matches = line.match(regex);
            if (matches) {
              results.push({
                file: path.relative(this.workingDir, fullPath),
                lineNumber: index + 1,
                line: line,
                matches: matches,
              });
            }
          });
        } catch (e) {
          // Skip files that can't be read
        }
      }
    }

    return results;
  }

  isBinaryFile(filename) {
    const binaryExtensions = [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".ico",
      ".pdf",
      ".zip",
      ".exe",
      ".dll",
      ".so",
      ".dylib",
      ".woff",
      ".woff2",
      ".ttf",
      ".eot",
    ];
    const ext = path.extname(filename).toLowerCase();
    return binaryExtensions.includes(ext);
  }

  getSchema() {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        path: {
          type: "string",
          required: true,
          description: "Directory to search in",
        },
        regex: {
          type: "string",
          required: true,
          description: "Regex pattern to search for",
        },
        filePattern: {
          type: "string",
          required: false,
          description: "File name pattern to filter",
        },
      },
    };
  }
}
