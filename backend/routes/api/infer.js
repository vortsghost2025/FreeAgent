/**
 * S:\workspace Infer Endpoint
 * 
 * Exposes local model inference capability to Oracle (C:\_bootstrap)
 * Supports multiple backends: Ollama, LM Studio, or custom
 * 
 * Endpoint: POST /api/infer
 * 
 * Request Body:
 * {
 *   prompt: string,        // The prompt to send to the model
 *   model?: string,        // Optional model name (defaults to configured default)
 *   temperature?: number,  // Optional temperature setting
 *   maxTokens?: number,   // Optional max tokens
 *   provider?: string     // Optional: 'ollama', 'lm-studio' (default: from env)
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   response: string,      // Model's text response
 *   model: string,         // Model used
 *   tokens?: number        // Number of tokens in response
 * }
 */

// Configuration
const INFER_PROVIDER = process.env.INFER_PROVIDER || 'ollama'; // 'ollama' or 'lm-studio'
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234';
const LM_STUDIO_API_TOKEN = process.env.LM_STUDIO_API_TOKEN || '';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'llama3.2:8b';

/**
 * Call LM Studio v1 API
 */
async function callLMStudio(prompt, model, temperature, maxTokens) {
  const response = await fetch(`${LM_STUDIO_URL}/api/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(LM_STUDIO_API_TOKEN ? { 'Authorization': `Bearer ${LM_STUDIO_API_TOKEN}` } : {})
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
      stream: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LM Studio error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return {
    response: result.message?.content || '',
    model: result.model,
    tokens: (result.prompt_eval_count || 0) + (result.eval_count || 0),
    done: result.done
  };
}

/**
 * Call Ollama API
 */
async function callOllama(prompt, model, temperature, maxTokens) {
  const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      prompt,
      temperature,
      max_tokens: maxTokens,
      stream: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return {
    response: result.response || '',
    model,
    tokens: result.eval_count || result.prompt_eval_count,
    done: result.done,
    context: result.context
  };
}

/**
 * Handle inference requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleInfer(req, res) {
  try {
    const { 
      prompt, 
      model = DEFAULT_MODEL, 
      temperature = 0.7, 
      maxTokens = 2048,
      provider = INFER_PROVIDER
    } = req.body;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid "prompt" field'
      });
    }

    // Validate model is allowed (security check)
    const allowedModels = [
      'llama3.2:8b', 'llama3.1:8b', 'llama3.2', 'llama3.1',
      'phi3:3.8b', 'phi3', 'mistral:7b', 'mistral',
      'deepseek-coder:6.7b', 'deepseek-coder', 'codellama:7b', 'codellama',
      'meditron:7b', 'qwen2.5:14b', 'qwen2.5', 'qwen2'
    ];
    
    const baseModel = model.split(':')[0];
    if (!allowedModels.includes(model) && !allowedModels.some(m => m.startsWith(baseModel))) {
      return res.status(400).json({
        success: false,
        error: `Model "${model}" is not in the allowed list`
      });
    }

    console.log(`[infer] Request - provider: ${provider}, model: ${model}, prompt length: ${prompt.length}`);

    // Route to appropriate provider
    let result;
    if (provider === 'lm-studio') {
      result = await callLMStudio(prompt, model, temperature, maxTokens);
    } else {
      // Default to Ollama
      result = await callOllama(prompt, model, temperature, maxTokens);
    }
    
    console.log(`[infer] Success - response length: ${result.response?.length || 0}`);

    // Return the response
    res.json({
      success: true,
      response: result.response || '',
      model: result.model,
      tokens: result.tokens,
      done: result.done,
      provider: provider
    });

  } catch (error) {
    console.error(`[infer] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Inference failed',
      message: error.message
    });
  }
}

/**
 * Handle chat requests (messages format for LM Studio)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleChat(req, res) {
  try {
    const { 
      messages,
      model = DEFAULT_MODEL, 
      temperature = 0.7, 
      maxTokens = 2048,
      provider = INFER_PROVIDER,
      contextLength
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid "messages" array'
      });
    }

    console.log(`[chat] Request - provider: ${provider}, model: ${model}, messages: ${messages.length}`);

    if (provider === 'lm-studio') {
      // Use LM Studio native chat
      const requestBody = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false
      };
      if (contextLength) requestBody.context_length = contextLength;

      const response = await fetch(`${LM_STUDIO_URL}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(LM_STUDIO_API_TOKEN ? { 'Authorization': `Bearer ${LM_STUDIO_API_TOKEN}` } : {})
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LM Studio chat failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return res.json({
        success: true,
        message: result.message,
        model: result.model,
        done: result.done,
        metrics: {
          promptTokens: result.prompt_eval_count,
          completionTokens: result.eval_count,
          totalTokens: (result.prompt_eval_count || 0) + (result.eval_count || 0)
        },
        provider: 'lm-studio'
      });
    } else {
      // Convert messages to prompt for Ollama
      const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const result = await callOllama(prompt, model, temperature, maxTokens);
      
      return res.json({
        success: true,
        message: { role: 'assistant', content: result.response },
        model: result.model,
        done: result.done,
        tokens: result.tokens,
        provider: 'ollama'
      });
    }

  } catch (error) {
    console.error(`[chat] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Chat failed',
      message: error.message
    });
  }
}

/**
 * Health check for the infer endpoint
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleHealth(req, res) {
  const health = {
    service: 'infer',
    provider: INFER_PROVIDER,
    defaultModel: DEFAULT_MODEL,
    timestamp: new Date().toISOString()
  };

  // Check Ollama
  try {
    const ollamaResponse = await fetch(`${OLLAMA_HOST}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    if (ollamaResponse.ok) {
      const data = await ollamaResponse.json();
      health.ollama = {
        status: 'available',
        host: OLLAMA_HOST,
        models: data.models?.map(m => m.name) || []
      };
    } else {
      health.ollama = { status: 'error', host: OLLAMA_HOST };
    }
  } catch (error) {
    health.ollama = { status: 'unavailable', host: OLLAMA_HOST, error: error.message };
  }

  // Check LM Studio
  try {
    const lmResponse = await fetch(`${LM_STUDIO_URL}/api/v1/models`, {
      method: 'GET',
      headers: LM_STUDIO_API_TOKEN ? { 'Authorization': `Bearer ${LM_STUDIO_API_TOKEN}` } : {},
      signal: AbortSignal.timeout(5000)
    });

    if (lmResponse.ok) {
      const data = await lmResponse.json();
      health.lmStudio = {
        status: 'available',
        url: LM_STUDIO_URL,
        models: data.data?.map(m => m.id) || []
      };
    } else {
      health.lmStudio = { status: 'error', url: LM_STUDIO_URL };
    }
  } catch (error) {
    health.lmStudio = { status: 'unavailable', url: LM_STUDIO_URL, error: error.message };
  }

  // Overall status
  if (INFER_PROVIDER === 'lm-studio' && health.lmStudio?.status === 'available') {
    health.status = 'healthy';
  } else if (INFER_PROVIDER === 'ollama' && health.ollama?.status === 'available') {
    health.status = 'healthy';
  } else {
    health.status = 'degraded';
  }

  res.writeHead(200, { "Content-Type": "application/json" });
res.end(JSON.stringify(health));
}

/**
 * List available models
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleModels(req, res) {
  const provider = req.query.provider || INFER_PROVIDER;
  
  try {
    if (provider === 'lm-studio') {
      const response = await fetch(`${LM_STUDIO_URL}/api/v1/models`, {
        method: 'GET',
        headers: LM_STUDIO_API_TOKEN ? { 'Authorization': `Bearer ${LM_STUDIO_API_TOKEN}` } : {},
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) throw new Error(`LM Studio returned ${response.status}`);
      const data = await response.json();
      
      return res.json({
        success: true,
        provider: 'lm-studio',
        models: data.data || []
      });
    } else {
      const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
      const data = await response.json();
      
      return res.json({
        success: true,
        provider: 'ollama',
        models: data.models || []
      });
    }
  } catch (error) {
    console.error(`[infer] Models error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch models',
      message: error.message
    });
  }
}

/**
 * Load model (LM Studio only)
 */
async function handleLoadModel(req, res) {
  const { model } = req.body;
  
  if (!model) {
    return res.status(400).json({ success: false, error: 'model is required' });
  }

  try {
    const response = await fetch(`${LM_STUDIO_URL}/api/v1/models/load`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(LM_STUDIO_API_TOKEN ? { 'Authorization': `Bearer ${LM_STUDIO_API_TOKEN}` } : {})
      },
      body: JSON.stringify({ model })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Load failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    res.json({ success: true, model, details: result });

  } catch (error) {
    console.error(`[infer] Load model error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Unload model (LM Studio only)
 */
async function handleUnloadModel(req, res) {
  const { model } = req.body;
  
  if (!model) {
    return res.status(400).json({ success: false, error: 'model is required' });
  }

  try {
    const response = await fetch(`${LM_STUDIO_URL}/api/v1/models/unload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(LM_STUDIO_API_TOKEN ? { 'Authorization': `Bearer ${LM_STUDIO_API_TOKEN}` } : {})
      },
      body: JSON.stringify({ model })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Unload failed: ${response.status} - ${errorText}`);
    }

    res.json({ success: true, model });

  } catch (error) {
    console.error(`[infer] Unload model error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Export handlers for Express
module.exports = {
  handleInfer,
  handleChat,
  handleHealth,
  handleModels,
  handleLoadModel,
  handleUnloadModel
};
