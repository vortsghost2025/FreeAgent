export { BaseProvider } from "./base.js";
export { OllamaProvider } from "./ollama.js";
export { GroqProvider } from "./groq.js";
export { TogetherProvider } from "./together.js";

export function createProvider(type, config = {}) {
  switch (type) {
    case "ollama":
      return new OllamaProvider(config);
    case "groq":
      return new GroqProvider(config);
    case "together":
      return new TogetherProvider(config);
    default:
      throw new Error(
        `Unknown provider: ${type}. Available: ollama, groq, together`,
      );
  }
}
