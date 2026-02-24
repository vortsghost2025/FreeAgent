/**
 * Base LLM Provider Interface
 * All providers (Ollama, Groq, Together AI) must implement this interface
 */
export class BaseProvider {
  constructor(config = {}) {
    this.config = config;
    this.name = "base";
    this.model = config.model || "default";
  }

  async *chat(message, options = {}) {
    throw new Error("chat() must be implemented by subclass");
  }

  async *chatWithHistory(messages, options = {}) {
    throw new Error("chatWithHistory() must be implemented by subclass");
  }

  async isAvailable() {
    throw new Error("isAvailable() must be implemented by subclass");
  }

  async listModels() {
    throw new Error("listModels() must be implemented by subclass");
  }

  getSystemPrompt() {
    return "You are an expert coding assistant with access to tools for file operations, command execution, and code search. You can use tools by responding with XML-style tags. Available tools: read_file, write_to_file, replace_in_file, list_files, search_files, execute_command, ask_followup_question. Always use exact file paths, read files before modifying, and ask for clarification when needed.";
  }
}
