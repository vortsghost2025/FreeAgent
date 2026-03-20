# Groq Routing Specification

**Target:** 97s → ~10s for multi-agent queries
**File to Modify:** `C:\workspace\medical\cockpit-server.js`

---

## CURRENT STATE

```javascript
// All queries go to Ollama (local, slow)
const result = await ensemble.execute(message);
// Multi-agent: 97s (too slow)
```

---

## TARGET STATE

```javascript
// Smart routing based on complexity
if (isComplexQuery(message, selectedAgents)) {
  // Route to Groq (cloud, fast)
  const result = await groqProvider.chat(message);
} else {
  // Route to Ollama (local, free)
  const result = await ollamaProvider.chat(message);
}
```

---

## IMPLEMENTATION

### Step 1: Add Complexity Detection

In `cockpit-server.js`, add before `/api/chat` handler:

```javascript
// Complexity detection for routing
function isComplexQuery(message, agents) {
  // Multi-agent = complex
  if (agents && agents.length > 1) return true;
  
  // Long message = complex
  if (message.length > 500) return true;
  
  // Security/clinical keywords = complex
  const complexKeywords = [
    'security audit', 'vulnerability', 'clinical analysis',
    'HIPAA', 'CDC', 'WHO', 'patient data', 'diagnosis',
    'comprehensive', 'full review', 'analyze all'
  ];
  if (complexKeywords.some(kw => message.toLowerCase().includes(kw))) {
    return true;
  }
  
  return false;
}
```

### Step 2: Modify `/api/chat` Handler

Find the `/api/chat` route and modify:

```javascript
app.post('/api/chat', async (req, res) => {
  const { message, selectedAgents } = req.body;
  
  try {
    // Detect complexity
    const complex = isComplexQuery(message, selectedAgents);
    
    // Get provider preference from request or auto-detect
    const preferCloud = req.body.preferCloud || complex;
    
    if (preferCloud && process.env.GROQ_API_KEY) {
      // Route to Groq for complex queries
      console.log('[Routing] Complex query → Groq (cloud)');
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: getSystemPrompt(selectedAgents) },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 4096
        })
      });
      
      const data = await response.json();
      const content = data.choices[0].message.content;
      
      return res.json({
        success: true,
        response: content,
        provider: 'groq',
        routed: 'complex',
        agents: selectedAgents
      });
    } else {
      // Route to Ollama for simple queries
      console.log('[Routing] Simple query → Ollama (local)');
      
      const result = await ensemble.execute(message, { agents: selectedAgents });
      
      return res.json({
        success: true,
        response: result.content,
        provider: 'ollama',
        routed: 'simple',
        agents: selectedAgents
      });
    }
  } catch (error) {
    // Fallback to Ollama if Groq fails
    console.error('[Routing] Groq failed, falling back to Ollama:', error.message);
    
    const result = await ensemble.execute(message, { agents: selectedAgents });
    
    return res.json({
      success: true,
      response: result.content,
      provider: 'ollama',
      routed: 'fallback',
      agents: selectedAgents
    });
  }
});

function getSystemPrompt(agents) {
  if (!agents || agents.length === 0) {
    return 'You are a helpful medical coding assistant.';
  }
  
  const agentPrompts = {
    code: 'You are a code generation specialist.',
    data: 'You are a data engineering specialist.',
    clinical: 'You are a clinical analysis specialist.',
    test: 'You are a testing specialist.',
    security: 'You are a security specialist.',
    api: 'You are an API integration specialist.',
    db: 'You are a database specialist.',
    devops: 'You are a DevOps specialist.'
  };
  
  return agents.map(a => agentPrompts[a] || '').join('\n');
}
```

### Step 3: Add Environment Variable

In `.env`:
```
GROQ_API_KEY=gsk_xxxxx
```

---

## EXPECTED RESULTS

| Query Type | Before | After | Provider |
|------------|--------|-------|----------|
| Single agent, simple | 26s | 26s | Ollama |
| Multi-agent | 97s | **~10s** | Groq |
| Long message | 60s+ | **~10s** | Groq |
| Security/clinical | 60s+ | **~10s** | Groq |

---

## TESTING

```powershell
# Test simple query (should use Ollama)
curl -X POST http://localhost:8889/api/chat -H "Content-Type: application/json" -d '{"message": "hello"}'

# Test complex query (should use Groq)
curl -X POST http://localhost:8889/api/chat -H "Content-Type: application/json" -d '{"message": "analyze this patient data for diabetes symptoms", "selectedAgents": ["data", "clinical"]}'
```

---

## FOR KILO TO IMPLEMENT

1. Add `isComplexQuery()` function to `cockpit-server.js`
2. Modify `/api/chat` handler with routing logic
3. Add `getSystemPrompt()` helper
4. Test with simple and complex queries
5. Verify 97s → ~10s improvement

---

**Spec complete. Ready for Kilo to implement.** 🦞
