/**
 * Terminal Executor - Cross-platform PowerShell/Bash command execution
 *
 * Supports:
 * - PowerShell on Windows
 * - Bash on Linux/Mac
 * - Script execution (.ps1, .sh)
 * - Proper escaping and security
 */

import { BaseTool } from "./base.js";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";

// Dangerous commands that require extra approval
const DANGEROUS_COMMANDS = [
  "rm -rf",
  "del /f",
  "format",
  "diskpart",
  "mkfs",
  "fdisk",
  "shutdown",
  "reboot",
];

export class TerminalExecutor extends BaseTool {
  constructor(config = {}) {
    super(config);
    this.name = "terminal_executor";
    this.description = "Execute PowerShell or bash commands";
    this.platform = process.platform;
    this.workingDir = config.workingDir || process.cwd();
    this.timeout = config.timeout || 60000; // 60 seconds default
  }

  /**
   * Execute command based on platform and shell preference
   */
  async execute(params) {
    const { command, shell, script, cwd, allowDangerous } = params;

    try {
      // Check for dangerous commands
      if (!allowDangerous && this.isDangerousCommand(command)) {
        return {
          success: false,
          requiresApproval: true,
          error: "Command requires approval: contains dangerous operation",
          command,
        };
      }

      // Determine shell to use
      const useShell = shell || this.getDefaultShell();

      // Execute based on shell type
      let result;
      if (useShell === "powershell") {
        result = await this.executePowerShell(command, script, cwd);
      } else {
        result = await this.executeBash(command, script, cwd);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        exitCode: error.code || -1,
        stderr: error.stderr || "",
      };
    }
  }

  /**
   * Get default shell for current platform
   */
  getDefaultShell() {
    if (this.platform === "win32") {
      return "powershell";
    } else {
      return "bash";
    }
  }

  /**
   * Check if command is dangerous
   */
  isDangerousCommand(command) {
    if (!command) return false;
    const lowerCommand = command.toLowerCase();
    return DANGEROUS_COMMANDS.some((dangerous) =>
      lowerCommand.includes(dangerous),
    );
  }

  /**
   * Execute PowerShell command
   */
  executePowerShell(command, scriptPath, customCwd) {
    return new Promise((resolve) => {
      const cwd = customCwd || this.workingDir;
      let args = [];
      let cmdToExecute = command;

      // If script file provided, run script
      if (scriptPath) {
        const fullPath = path.resolve(cwd, scriptPath);
        cmdToExecute = `& "${fullPath}"`;
      } else {
        // Escape single quotes and backticks in PowerShell
        cmdToExecute = this.escapePowerShell(command);
      }

      args = ["-NoProfile", "-Command", cmdToExecute];

      const proc = spawn("powershell.exe", args, {
        cwd,
        env: { ...process.env },
        timeout: this.timeout,
        shell: false,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString("utf8");
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString("utf8");
      });

      proc.on("close", (code) => {
        resolve({
          success: code === 0,
          exitCode: code,
          output: stdout,
          stdout,
          stderr,
          shell: "powershell",
          command: command,
        });
      });

      proc.on("error", (error) => {
        resolve({
          success: false,
          error: error.message,
          exitCode: -1,
          stderr: stderr,
          shell: "powershell",
        });
      });
    });
  }

  /**
   * Execute bash command
   */
  executeBash(command, scriptPath, customCwd) {
    return new Promise((resolve) => {
      const cwd = customCwd || this.workingDir;
      let shellPath;
      let args = [];
      let cmdToExecute = command;

      // Determine bash shell (bash on Unix/Linux/Mac)
      if (this.platform === "darwin") {
        shellPath = "/bin/zsh"; // macOS default is zsh
      } else {
        shellPath = "/bin/bash";
      }

      // If script file provided, run script
      if (scriptPath) {
        const fullPath = path.resolve(cwd, scriptPath);
        cmdToExecute = `"${fullPath}"`;
      } else {
        // Escape special characters in bash
        cmdToExecute = this.escapeBash(command);
      }

      args = ["-c", cmdToExecute];

      const proc = spawn(shellPath, args, {
        cwd,
        env: { ...process.env },
        timeout: this.timeout,
        shell: false,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString("utf8");
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString("utf8");
      });

      proc.on("close", (code) => {
        resolve({
          success: code === 0,
          exitCode: code,
          output: stdout,
          stdout,
          stderr,
          shell: "bash",
          command: command,
        });
      });

      proc.on("error", (error) => {
        resolve({
          success: false,
          error: error.message,
          exitCode: -1,
          stderr: stderr,
          shell: "bash",
        });
      });
    });
  }

  /**
   * Escape special characters for PowerShell
   */
  escapePowerShell(str) {
    return str.replace(/`/g, "``").replace(/"/g, '`"').replace(/\$/g, "`$");
  }

  /**
   * Escape special characters for bash
   */
  escapeBash(str) {
    return str
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/`/g, "\\`")
      .replace(/\$/g, "\\$");
  }

  /**
   * Execute npm commands (helper method)
   */
  async executeNpmCommand(npmArgs) {
    const npmCmd = this.platform === "win32" ? "npm.cmd" : "npm";
    const command = `${npmCmd} ${npmArgs.join(" ")}`;
    return await this.execute({ command });
  }

  /**
   * Execute git commands (helper method)
   */
  async executeGitCommand(gitArgs) {
    const command = `git ${gitArgs.join(" ")}`;
    return await this.execute({ command });
  }

  /**
   * Execute Docker commands (helper method)
   */
  async executeDockerCommand(dockerArgs) {
    const command = `docker ${dockerArgs.join(" ")}`;
    return await this.execute({ command });
  }

  /**
   * Run PowerShell script file
   */
  async runPowerShellScript(scriptPath, args = []) {
    const argString = args.map((arg) => `"${arg}"`).join(" ");
    const command = `& "${scriptPath}" ${argString}`;
    return await this.execute({ command, shell: "powershell" });
  }

  /**
   * Run bash script file
   */
  async runBashScript(scriptPath, args = []) {
    const argString = args.map((arg) => `"${arg}"`).join(" ");
    const command = `"${scriptPath}" ${argString}`;
    return await this.execute({ command, shell: "bash" });
  }

  /**
   * Get tool schema
   */
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
        shell: {
          type: "string",
          required: false,
          description: "Shell to use: powershell, bash, or auto",
        },
        script: {
          type: "string",
          required: false,
          description: "Path to script file (.ps1 or .sh)",
        },
        cwd: {
          type: "string",
          required: false,
          description: "Working directory for command",
        },
        allowDangerous: {
          type: "boolean",
          required: false,
          description: "Allow dangerous commands without approval",
        },
      },
    };
  }
}
