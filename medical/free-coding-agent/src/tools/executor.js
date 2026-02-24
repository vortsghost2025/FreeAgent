import { ReadFileTool } from "./read-file.js";
import { WriteFileTool } from "./write-file.js";
import { ReplaceInFileTool } from "./replace-file.js";
import { ListFilesTool } from "./list-files.js";
import { SearchFilesTool } from "./search-files.js";
import { ExecuteCommandTool } from "./execute-command.js";
import { AskQuestionTool } from "./ask-question.js";
import { TerminalExecutor } from "./terminal-executor.js";
import { ErrorFixer } from "./error-fixer.js";
import { ToolParser } from "./parser.js";

export class ToolExecutor {
  constructor(config = {}) {
    this.parser = new ToolParser();
    this.workingDir = config.workingDir || process.cwd();
    this.requiresApproval = config.requiresApproval ?? true;
    this.onQuestion = config.onQuestion || null;

    // Initialize tools
    this.tools = new Map();
    this.registerTools();
  }

  registerTools() {
    const toolConfig = {
      workingDir: this.workingDir,
      requiresApproval: this.requiresApproval,
    };

    this.tools.set("read_file", new ReadFileTool(toolConfig));
    this.tools.set("write_to_file", new WriteFileTool(toolConfig));
    this.tools.set("replace_in_file", new ReplaceInFileTool(toolConfig));
    this.tools.set("list_files", new ListFilesTool(toolConfig));
    this.tools.set("search_files", new SearchFilesTool(toolConfig));
    this.tools.set("execute_command", new ExecuteCommandTool(toolConfig));
    this.tools.set(
      "ask_followup_question",
      new AskQuestionTool({
        ...toolConfig,
        onQuestion: this.onQuestion,
      }),
    );
    this.tools.set("terminal_executor", new TerminalExecutor(toolConfig));
    this.tools.set("error_fixer", new ErrorFixer(toolConfig));
  }

  /**
   * Parse and execute tools from text
   * @param {string} text - Text containing tool invocations
   * @returns {AsyncGenerator<{tool: string, result: object}>}
   */
  async *parseAndExecute(text) {
    const toolCalls = this.parser.parse(text);

    for (const { tool, params } of toolCalls) {
      const result = await this.execute(tool, params);
      yield { tool, params, result };
    }
  }

  /**
   * Execute a single tool
   * @param {string} toolName - Name of the tool
   * @param {object} params - Parameters for the tool
   * @returns {Promise<object>}
   */
  async execute(toolName, params) {
    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${toolName}`,
      };
    }

    try {
      return await tool.execute(params);
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if text contains tool invocations
   */
  hasTools(text) {
    return this.parser.hasTools(text);
  }

  /**
   * Get all registered tools
   */
  getToolSchemas() {
    return Array.from(this.tools.values()).map((tool) => tool.getSchema());
  }
}
