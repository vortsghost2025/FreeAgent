import { BaseTool } from "./base.js";
import { spawn } from "child_process";

export class ExecuteCommandTool extends BaseTool {
  constructor(config = {}) {
    super(config);
    this.name = "execute_command";
    this.description = "Execute a shell command";
    this.workingDir = config.workingDir || process.cwd();
    this.timeout = config.timeout || 60000; // 60 seconds default
    this.requiresApproval = config.requiresApproval ?? true;
  }

  async execute(params) {
    try {
      if (!params.command) {
        return { success: false, error: "Missing required parameter: command" };
      }

      // Check if command requires approval
      if (this.requiresApproval && !params.approved) {
        return {
          success: false,
          requiresApproval: true,
          error: "This command requires approval before execution.",
          command: params.command,
        };
      }

      const result = await this.runCommand(params.command);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  runCommand(command) {
    return new Promise((resolve) => {
      const isWindows = process.platform === "win32";
      const shell = isWindows ? "cmd.exe" : "/bin/bash";
      const args = isWindows ? ["/c", command] : ["-c", command];

      const proc = spawn(shell, args, {
        cwd: this.workingDir,
        env: { ...process.env },
        timeout: this.timeout,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        resolve({
          success: code === 0,
          exitCode: code,
          output: stdout || stderr,
          stdout: stdout,
          stderr: stderr,
        });
      });

      proc.on("error", (error) => {
        resolve({
          success: false,
          error: error.message,
        });
      });
    });
  }

  getSchema() {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        command: {
          type: "string",
          required: true,
          description: "Command to execute",
        },
        approved: {
          type: "boolean",
          required: false,
          description: "Whether command is approved",
        },
      },
    };
  }
}
