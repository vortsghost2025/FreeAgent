/**
 * GOOGLE GEMINI ENDPOINT (Vertex AI)
 * Implements LocalModelEndpoint for Google Gemini via Vertex AI
 * Production-ready cloud inference with Gemini Pro/Flash models
 */

import { LocalModelEndpoint } from "../local-agent-interface.js";

export class GeminiEndpoint extends LocalModelEndpoint {
  constructor(config = {}) {
    super();
    // Google Cloud configuration
    this.projectId = config.projectId || process.env.GCP_PROJECT_ID || null;
    this.location = config.location || process.env.GCP_LOCATION || 'us-central1';
    this.model = config.model || 'gemini-1.5-flash';
    this.timeout = config.timeout || 120000; // 2 minutes
    this.enabled = config.enabled !== false && !!this.projectId;
    this.cachedInfo = null;
    
    // Lazy-loaded Vertex AI client
    this._vertexAI = null;
    this._generativeModel = null;
    
    // Priority routing - Gemini handles complex reasoning
    this.priority = config.priority || 9; // Higher than OpenAI (8), lower than Kilo (10)
    this.capabilities = config.capabilities || [
      'auto-fix',
      'auto-triage', 
      'multi-agent-orchestration',
      'code-generation',
      'complex-reasoning',
      'medical-analysis',
      'security-audit',
      'high-precision-reasoning',
      'long-context-understanding'
    ];
    
    console.log(`[Gemini] Endpoint initialized with model: ${this.model}, location: ${this.location}`);
  }

  /**
   * Initialize Vertex AI client (lazy loaded)
   */
  async _getVertexAI() {
    if (!this._vertexAI) {
      try {
        const { VertexAI } = await import('@google-cloud/vertexai');
        this._vertexAI = new VertexAI({
          project: this.projectId,
          location: this.location
        });
      } catch (error) {
        console.error('[Gemini] Failed to import Vertex AI:', error.message);
        throw new Error('Google Cloud Vertex AI SDK not installed. Run: npm install @google-cloud/vertexai');
      }
    }
    return this._vertexAI;
  }

  /**
   * Get or create generative model
   */
  async _getGenerativeModel(modelName) {
    const vertexAI = await this._getVertexAI();
    return vertexAI.preview.getGenerativeModel({
      model: modelName || this.model,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 4096,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
    });
  }

  /**
   * Generate completion from Gemini via Vertex AI
   */
  async generate(input, options = {}) {
    if (!this.enabled) {
      throw new Error("Gemini endpoint is disabled or missing GCP project ID");
    }

    if (!this.projectId) {
      throw new Error("GCP Project ID is required. Set GCP_PROJECT_ID environment variable.");
    }

    const model = options.model || this.model;
    console.log(`[Gemini] Generating with model: ${model}`);

    try {
      const generativeModel = await this._getGenerativeModel(model);
      
      // Build contents array based on input type
      let contents;
      if (typeof input === 'string') {
        contents = [{ role: 'user', parts: [{ text: input }] }];
      } else if (Array.isArray(input)) {
        contents = input.map(msg => ({
          role: msg.role === 'system' ? 'user' : msg.role,
          parts: [{ text: msg.content }]
        }));
      } else if (typeof input === 'object' && input.messages) {
        contents = input.messages.map(msg => ({
          role: msg.role === 'system' ? 'user' : msg.role,
          parts: [{ text: msg.content }]
        }));
      } else if (typeof input === 'object' && input.prompt) {
        contents = [{ role: 'user', parts: [{ text: input.prompt }] }];
      } else {
        throw new Error(`Gemini generate() requires string, array, or object with prompt/messages`);
      }

      console.log(`[Gemini] Sending ${contents.length} content items`);

      // Generate content with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const result = await generativeModel.generateContent({
          contents: contents,
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.max_tokens || 4096,
            topP: options.topP || 0.95,
            topK: options.topK || 40,
          },
          systemInstruction: options.system ? [{ role: 'user', parts: [{ text: options.system }] }] : undefined,
        });
        
        clearTimeout(timeoutId);

        // Extract response text
        const response = result.response;
        const candidates = response.candidates;
        
        if (!candidates || candidates.length === 0) {
          const promptFeedback = response.promptFeedback;
          if (promptFeedback) {
            throw new Error(`Gemini blocked prompt: ${JSON.stringify(promptFeedback)}`);
          }
          return "";
        }

        const content = candidates[0].content;
        const parts = content.parts;
        
        if (!parts || parts.length === 0) {
          return "";
        }

        const text = parts.map(part => part.text).join('');
        console.log(`[Gemini] Response: ${text.substring(0, 100)}...`);

        return text;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          throw new Error(`Gemini generation timed out after ${this.timeout}ms`);
        }
        throw error;
      }
    } catch (error) {
      console.error('[Gemini] Generate error:', error.message);
      throw error;
    }
  }

  /**
   * Generate multiple completions in parallel
   */
  async generateBatch(prompts, options = {}) {
    if (!this.enabled) {
      throw new Error("Gemini endpoint is disabled");
    }

    console.log(`[Gemini] Batch generating ${prompts.length} prompts`);

    const results = await Promise.all(
      prompts.map(prompt => this.generate(prompt, options))
    );

    return results;
  }

  /**
   * Get provider information and capabilities
   */
  async getModelInfo() {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    this.cachedInfo = {
      provider_id: 'gemini',
      provider_type: 'cloud',
      location: this.location,
      model: this.model,
      available_models: [
        { id: 'gemini-1.5-pro', description: 'Gemini Pro - best for complex reasoning' },
        { id: 'gemini-1.5-flash', description: 'Gemini Flash - fast and efficient' },
        { id: 'gemini-1.5-flash-8b', description: 'Gemini Flash 8B - lighter weight' },
        { id: 'gemini-2.0-flash', description: 'Gemini 2.0 Flash - latest model' }
      ],
      max_tokens: 8192,
      context_window: 2000000,
      cost_per_token: 0.00000125,
      priority: this.priority,
      capabilities: this.capabilities,
      features: {
        streaming: true,
        function_calling: true,
        vision: true,
        long_context: true,
        json_mode: true
      }
    };

    return this.cachedInfo;
  }

  /**
   * Check if Gemini API is accessible
   */
  async healthCheck() {
    if (!this.projectId) {
      return false;
    }

    try {
      const vertexAI = await this._getVertexAI();
      return !!vertexAI;
    } catch (error) {
      console.error('[Gemini] Health check failed:', error.message);
      return false;
    }
  }

  /**
   * Get system prompt for this provider
   */
  getSystemPrompt() {
    return "You are an expert coding and reasoning assistant with access to tools. Use Gemini's strengths in long-context understanding and complex reasoning.";
  }
}
