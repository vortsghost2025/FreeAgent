/**
 * LM Studio v1 API Client
 * 
 * Client for LM Studio's native v1 REST API
 * Documentation: https://lmstudio.ai/docs/api
 * 
 * Features:
 * - /api/v1/chat - Chat/completion with streaming support
 * - /api/v1/models - Model management
 * - Model load/unload/download endpoints
 * - Stateful chat, streaming, context length configuration
 * 
 * Configuration:
 * - LM_STUDIO_URL: Base URL for LM Studio (default: http://localhost:1234)
 * - LM_STUDIO_API_TOKEN: Optional API token for authentication
 */

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234';
const LM_STUDIO_API_TOKEN = process.env.LM_STUDIO_API_TOKEN || '';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'llama3.2:8b';
const TIMEOUT = parseInt(process.env.LOCAL_MODEL_TIMEOUT || '180000', 10);
const STREAM_TIMEOUT = parseInt(process.env.LM_STUDIO_STREAM_TIMEOUT || '300000', 10); // 5min for streaming

/**
 * LMStudioClient class
 * Provides methods to interact with LM Studio v1 REST API
 */
class LMStudioClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || LM_STUDIO_URL;
    this.apiToken = config.apiToken || LM_STUDIO_API_TOKEN;
    this.defaultModel = config.defaultModel || DEFAULT_MODEL;
    this.timeout = config.timeout || TIMEOUT;
    this.streamTimeout = config.streamTimeout || STREAM_TIMEOUT;
    this.debug = config.debug || false;
    this.maxRetries = config.maxRetries || 2;
  }

  /**
   * Log debug message
   */
  log(...args) {
    if (this.debug) {
      console.log('[LMStudioClient]', ...args);
    }
  }

  /**
   * Get default headers for requests
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.apiToken) {
      headers['Authorization'] = `Bearer ${this.apiToken}`;
    }
    return headers;
  }

  /**
   * Call the chat endpoint (POST /api/v1/chat)
   * @param {Object} options
   * @param {Array} options.messages - Chat messages [{role: 'user'|'assistant'|'system', content: '...'}]
   * @param {string} [options.model] - Model to use
   * @param {number} [options.temperature] - Temperature setting (0-2)
   * @param {number} [options.maxTokens] - Max tokens to generate
   * @param {number} [options.contextLength] - Context length override
   * @param {boolean} [options.stream] - Enable streaming response
   * @param {Function} [options.onChunk] - Streaming callback for each chunk
   * @returns {Promise<Object>} Response with message, done, metrics
   */
  async chat(options) {
    const {
      messages,
      model = this.defaultModel,
      temperature = 0.7,
      maxTokens = 2048,
      contextLength,
      stream = false,
      onChunk
    } = options;

    if (!messages || !Array.isArray(messages)) {
      throw new Error('messages array is required');
    }

    const url = `${this.baseUrl}/api/v1/chat`;
    this.log('Calling chat:', { url, model, messageCount: messages.length, stream });

    const requestBody = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream
    };

    // Add optional context length
    if (contextLength) {
      requestBody.context_length = contextLength;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // For streaming, use different handling
      if (stream && onChunk) {
        return await this.handleStreamingRequest(url, requestBody, controller, onChunk);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Chat failed: ${response.status} - ${error}`);
      }

      const result = await response.json();
      this.log('Chat success:', { 
        model, 
        responseLength: result.message?.content?.length,
        done: result.done
      });

      return {
        success: true,
        message: result.message,
        model: result.model,
        done: result.done,
        metrics: {
          promptTokens: result.prompt_eval_count,
          completionTokens: result.eval_count,
          totalTokens: (result.prompt_eval_count || 0) + (result.eval_count || 0)
        }
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Chat timeout after ${this.timeout}ms`);
      }
      
      this.log('Chat error:', error.message);
      throw error;
    }
  }

  /**
   * Handle streaming request with proper timeout
   */
  async handleStreamingRequest(url, requestBody, controller, onChunk) {
    const streamController = new AbortController();
    const timeoutId = setTimeout(() => streamController.abort(), this.streamTimeout);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
        signal: streamController.signal
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Streaming chat failed: ${response.status} - ${error}`);
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';
      let chunksReceived = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          chunksReceived++;
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines (SSE format)
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                clearTimeout(timeoutId);
                return {
                  success: true,
                  message: { role: 'assistant', content: fullContent },
                  done: true,
                  chunks: chunksReceived
                };
              }
              
              try {
                const parsed = JSON.parse(data);
                
                // Accumulate content
                if (parsed.choices?.[0]?.delta?.content) {
                  fullContent += parsed.choices[0].delta.content;
                }
                
                // Call chunk callback
                if (onChunk) {
                  onChunk(parsed);
                }
              } catch (e) {
                // Ignore parse errors for non-JSON lines
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
        clearTimeout(timeoutId);
      }

      return {
        success: true,
        message: { role: 'assistant', content: fullContent },
        done: true,
        chunks: chunksReceived
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Streaming timeout after ${this.streamTimeout}ms`);
      }
      throw error;
    }
  }

  /**
   * List available models (GET /api/v1/models)
   * @returns {Promise<Object>} List of models
   */
  async listModels() {
    const url = `${this.baseUrl}/api/v1/models`;
    this.log('Listing models:', url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`List models failed: ${response.status} - ${error}`);
      }

      const result = await response.json();
      this.log('Models found:', result.data?.length || 0);

      return {
        success: true,
        models: result.data || []
      };

    } catch (error) {
      clearTimeout(timeoutId);
      this.log('List models error:', error.message);
      throw error;
    }
  }

  /**
   * Load a model (POST /api/v1/models/load)
   * @param {Object} options
   * @param {string} [options.model] - Model identifier to load
   * @param {Function} [options.onProgress] - Progress callback for streaming events
   * @returns {Promise<Object>} Load result
   */
  async loadModel(options = {}) {
    const { model = this.defaultModel, onProgress } = options;

    const url = `${this.baseUrl}/api/v1/models/load`;
    this.log('Loading model:', { url, model });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ model }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Load model failed: ${response.status} - ${error}`);
      }

      const result = await response.json();
      this.log('Model loaded:', { model, success: result.success });

      return {
        success: true,
        model: result.model || model,
        details: result
      };

    } catch (error) {
      clearTimeout(timeoutId);
      this.log('Load model error:', error.message);
      throw error;
    }
  }

  /**
   * Unload a model (POST /api/v1/models/unload)
   * @param {Object} options
   * @param {string} [options.model] - Model identifier to unload
   * @returns {Promise<Object>} Unload result
   */
  async unloadModel(options = {}) {
    const { model = this.defaultModel } = options;

    const url = `${this.baseUrl}/api/v1/models/unload`;
    this.log('Unloading model:', { url, model });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ model }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Unload model failed: ${response.status} - ${error}`);
      }

      const result = await response.json();
      this.log('Model unloaded:', { model });

      return {
        success: true,
        model
      };

    } catch (error) {
      clearTimeout(timeoutId);
      this.log('Unload model error:', error.message);
      throw error;
    }
  }

  /**
   * Download a model (POST /api/v1/models/download)
   * @param {Object} options
   * @param {string} options.model - Model identifier to download
   * @returns {Promise<Object>} Download result
   */
  async downloadModel(options = {}) {
    const { model } = options;

    if (!model) {
      throw new Error('model is required for download');
    }

    const url = `${this.baseUrl}/api/v1/models/download`;
    this.log('Downloading model:', { url, model });

    const controller = new AbortController();
    // Long timeout for downloads
    const timeoutId = setTimeout(() => controller.abort(), 3600000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ model }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Download model failed: ${response.status} - ${error}`);
      }

      const result = await response.json();
      this.log('Download started:', { model, downloadId: result.downloadId });

      return {
        success: true,
        downloadId: result.downloadId,
        model
      };

    } catch (error) {
      clearTimeout(timeoutId);
      this.log('Download model error:', error.message);
      throw error;
    }
  }

  /**
   * Get download status (GET /api/v1/models/download/status)
   * @param {Object} options
   * @param {string} [options.downloadId] - Optional download ID to check
   * @returns {Promise<Object>} Download status
   */
  async getDownloadStatus(options = {}) {
    const { downloadId } = options;

    const url = downloadId 
      ? `${this.baseUrl}/api/v1/models/download/status?downloadId=${downloadId}`
      : `${this.baseUrl}/api/v1/models/download/status`;
    
    this.log('Checking download status:', url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Get download status failed: ${response.status} - ${error}`);
      }

      return await response.json();

    } catch (error) {
      clearTimeout(timeoutId);
      this.log('Get download status error:', error.message);
      throw error;
    }
  }

  /**
   * Validate provider configuration
   * @returns {Object} Validation result
   */
  validateConfig() {
    const issues = [];
    
    if (!this.baseUrl) {
      issues.push('baseUrl is required');
    }
    
    if (this.baseUrl && !this.baseUrl.startsWith('http')) {
      issues.push('baseUrl must start with http or https');
    }
    
    if (this.apiToken && this.apiToken.length < 10) {
      issues.push('apiToken appears invalid (too short)');
    }
    
    // Check for common misconfigurations
    if (this.baseUrl && this.baseUrl.includes('localhost') && this.timeout < 60000) {
      this.log('Warning: Localhost requests may need longer timeout');
    }
    
    return {
      valid: issues.length === 0,
      issues,
      config: {
        baseUrl: this.baseUrl,
        hasApiToken: !!this.apiToken,
        defaultModel: this.defaultModel,
        timeout: this.timeout,
        streamTimeout: this.streamTimeout
      }
    };
  }

  /**
   * Check health of LM Studio
   * @returns {Promise<Object>} Health status
   */
  async health() {
    const url = `${this.baseUrl}/api/v1/models`;
    this.log('Checking health:', url);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const models = await response.json();
        return {
          status: 'healthy',
          service: 'lm-studio',
          baseUrl: this.baseUrl,
          models: models.data?.length || 0,
          timestamp: new Date().toISOString()
        };
      }

      return {
        status: 'unhealthy',
        error: `HTTP ${response.status}`
      };

    } catch (error) {
      return {
        status: 'unreachable',
        error: error.message
      };
    }
  }

  /**
   * Simple chat - send a message and get response
   * @param {string} prompt - The prompt/message
   * @param {Object} options - Optional settings
   * @returns {Promise<string>} The assistant's response
   */
  async generate(prompt, options = {}) {
    const messages = [{ role: 'user', content: prompt }];
    const result = await this.chat({ 
      messages, 
      ...options 
    });
    return result.message?.content || '';
  }

  /**
   * Convert messages array to prompt format for non-chat completion
   * @param {Array} messages - Messages array
   * @returns {string} Formatted prompt
   */
  messagesToPrompt(messages) {
    return messages.map(m => `${m.role}: ${m.content}`).join('\n');
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LMStudioClient, LM_STUDIO_URL, LM_STUDIO_API_TOKEN, DEFAULT_MODEL, TIMEOUT, STREAM_TIMEOUT };
}

// Also support ES modules
export { LMStudioClient, LM_STUDIO_URL, LM_STUDIO_API_TOKEN, DEFAULT_MODEL, TIMEOUT, STREAM_TIMEOUT };
export default LMStudioClient;
