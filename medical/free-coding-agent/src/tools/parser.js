/**
 * Tool Parser - Extracts tool invocations from LLM responses
 */

export class ToolParser {
  constructor() {
    this.toolPattern = /<(\w+)>([\s\S]*?)<\/\1>/g;
  }

  /**
   * Parse tool invocations from text
   * @param {string} text - The text to parse
   * @returns {Array<{tool: string, params: object}>}
   */
  parse(text) {
    const tools = [];
    const topLevelTools = this.extractTopLevelTools(text);

    for (const { toolName, content } of topLevelTools) {
      const params = this.parseParams(content);
      tools.push({ tool: toolName, params });
    }

    return tools;
  }

  /**
   * Extract top-level tool invocations
   */
  extractTopLevelTools(text) {
    const tools = [];
    const toolNames = [
      "read_file",
      "write_to_file",
      "replace_in_file",
      "list_files",
      "search_files",
      "execute_command",
      "ask_followup_question",
    ];

    for (const toolName of toolNames) {
      const pattern = new RegExp(
        `<${toolName}>([\\s\\S]*?)<\\/${toolName}>`,
        "g",
      );
      let match;

      while ((match = pattern.exec(text)) !== null) {
        tools.push({
          toolName,
          content: match[1],
        });
      }
    }

    return tools;
  }

  /**
   * Parse parameters from tool content
   */
  parseParams(content) {
    const params = {};
    const paramPattern = /<(\w+)>([\s\S]*?)<\/\1>/g;
    let match;

    while ((match = paramPattern.exec(content)) !== null) {
      const paramName = match[1];
      const paramValue = match[2].trim();
      params[paramName] = paramValue;
    }

    // Handle special case for content in write_to_file
    // Content might not be wrapped in XML tags
    if (!params.content && content.includes("<content>")) {
      const contentMatch = content.match(/<content>([\s\S]*)<\/content>/);
      if (contentMatch) {
        params.content = contentMatch[1];
      }
    }

    // Handle special case for diff in replace_in_file
    if (!params.diff && content.includes("<diff>")) {
      const diffMatch = content.match(/<diff>([\s\S]*)<\/diff>/);
      if (diffMatch) {
        params.diff = diffMatch[1];
      }
    }

    return params;
  }

  /**
   * Check if text contains any tool invocations
   */
  hasTools(text) {
    const toolNames = [
      "read_file",
      "write_to_file",
      "replace_in_file",
      "list_files",
      "search_files",
      "execute_command",
      "ask_followup_question",
    ];

    for (const toolName of toolNames) {
      if (text.includes(`<${toolName}>`)) {
        return true;
      }
    }

    return false;
  }
}
