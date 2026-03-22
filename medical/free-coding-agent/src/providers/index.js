import { BaseProvider } from "./base.js";
import { OllamaProvider } from "./ollama.js";
import { GroqProvider } from "./groq.js";
import { TogetherProvider } from "./together.js";
import { LMStudioProvider } from "./lmstudio.js";
import { HuggingFaceProvider } from "./huggingface.js";
import { OpenRouterProvider } from "./openrouter.js";
import { GeminiEndpoint } from "./gemini-endpoint.js";

export { BaseProvider };
export { OllamaProvider };
export { GroqProvider };
export { TogetherProvider };
export { LMStudioProvider };
export { HuggingFaceProvider };
export { OpenRouterProvider };
export { GeminiEndpoint };

export function createProvider(type, config = {}) {
  switch (type) {
    case "ollama":
      return new OllamaProvider(config);
    case "groq":
      return new GroqProvider(config);
    case "together":
      return new TogetherProvider(config);
    case "lmstudio":
      return new LMStudioProvider(config);
    case "huggingface":
      return new HuggingFaceProvider(config);
    case "openrouter":
      return new OpenRouterProvider(config);
    case "gemini":
      return new GeminiEndpoint(config);
    default:
      throw new Error(
        `Unknown provider: ${type}. Available: ollama, groq, together, lmstudio, huggingface, openrouter, gemini`,
      );
  }
}
