with open('/app/bin/ensemble-web-fixed.js', 'r') as f:
    content = f.read()

REAL_IMPL = """
const REAL_AGENT_PROMPTS = {
  'Code Generation': 'You are an expert software engineer in a multi-agent AI cockpit. Write clean, correct, production-ready code. Be direct and technical.',
  'Data Engineering': 'You are a data engineering specialist. Design schemas, build ETL pipelines, validate data, optimize queries.',
  'Analysis': 'You are a systems analyst. Decompose problems, identify edge cases, provide architectural insights.',
  'Planning': 'You are a strategic planner. Create structured action plans, break work into phases, identify blockers.',
  'Review': 'You are a senior code reviewer. Review for correctness, security, performance, and maintainability.',
  'Security': 'You are a security specialist. Identify vulnerabilities, check OWASP issues and data exposure.',
  'Testing': 'You are a QA engineer. Design test strategies, write unit and integration tests.',
  'DevOps': 'You are a DevOps engineer. Handle CI/CD, containerization, monitoring, and deployment.',
  'code_generation': 'You are an expert software engineer. Write clean, correct, production-ready code.',
  'data_engineering': 'You are a data engineering specialist. Design schemas and ETL pipelines.',
  'clinical_analysis': 'You are a clinical data specialist focused on CDC/WHO guidelines and HIPAA.',
  'testing': 'You are a QA engineer. Write comprehensive tests and ensure coverage.',
  'security': 'You are a security specialist. Check OWASP vulnerabilities and enforce best practices.',
  'api_integration': 'You are an API integration specialist. Design RESTful endpoints and write OpenAPI specs.',
  'database': 'You are a database architect. Design schemas, optimize queries, handle migrations.',
  'devops': 'You are a DevOps engineer. Handle CI/CD, Docker, monitoring and infrastructure.'
};

const OPENROUTER_MODELS = [
  'meta-llama/llama-3.2-3b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free',
  'google/gemma-7b-it:free'
];

async function callRealAgent(role, task, apiKey) {
  const systemPrompt = REAL_AGENT_PROMPTS[role] || 'You are a specialized AI coding agent. Analyze the task and provide expert assistance.';
  let lastError = null;
  for (const model of OPENROUTER_MODELS) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'SNAC Free Coding Agent'
        },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: task }], stream: false, temperature: 0.7, max_tokens: 1024 })
      });
      if (!response.ok) {
        const err = await response.text();
        if (response.status === 429) { lastError = new Error('Rate limited'); continue; }
        throw new Error('OpenRouter ' + response.status + ': ' + err);
      }
      const data = await response.json();
      const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (!content) throw new Error('Empty response');
      console.log('Real response from ' + model + ' for [' + role + ']');
      return content;
    } catch (err) {
      console.warn(model + ' failed for [' + role + ']: ' + err.message);
      lastError = err;
    }
  }
  throw lastError || new Error('All OpenRouter models failed');
}

async function handleEnsembleChat(session, message) {
  const { task, agents, mode } = message;
  console.log('REAL ensemble chat:', { task: task && task.substring(0, 60), agents, mode });

  const apiKey = process.env.OPENROUTER_API_KEY || '';
  if (!apiKey) {
    session.ws.send(JSON.stringify({ type: 'ensemble_error', error: 'OPENROUTER_API_KEY not configured.' }));
    return;
  }

  try {
    const startTime = Date.now();
    session.ws.send(JSON.stringify({ type: 'ensemble_started', agents, mode, taskId: 'task-' + Date.now() }));

    const runAgent = async (role) => {
      session.ws.send(JSON.stringify({ type: 'ensemble_event', event: { type: 'agent_working', agentId: 'agent-' + role, role }, timestamp: Date.now() }));
      try {
        const response = await callRealAgent(role, task, apiKey);
        session.ws.send(JSON.stringify({ type: 'ensemble_event', event: { type: 'agent_complete', agentId: 'agent-' + role, role, success: true, processingTime: Date.now() - startTime, responses: [{ type: 'complete', content: response }] }, timestamp: Date.now() }));
        return { role, response };
      } catch (err) {
        session.ws.send(JSON.stringify({ type: 'ensemble_event', event: { type: 'agent_complete', agentId: 'agent-' + role, role, success: false, processingTime: Date.now() - startTime, responses: [{ type: 'error', content: 'Error: ' + err.message }] }, timestamp: Date.now() }));
        return { role, error: err.message };
      }
    };

    const results = (mode === 'parallel' || !mode)
      ? await Promise.all(agents.map(runAgent))
      : await agents.reduce(async (p, r) => { const a = await p; return [...a, await runAgent(r)]; }, Promise.resolve([]));

    session.ws.send(JSON.stringify({ type: 'ensemble_complete', totalProcessingTime: Date.now() - startTime, agents: agents.length }));

    if (session.memoryDB) {
      await session.memoryDB.recordTask({ taskType: 'ensemble_chat', inputSummary: task.substring(0, 100), resultSummary: 'Completed via OpenRouter', success: true, processingTime: Date.now() - startTime, agentRoles: agents });
    }
  } catch (error) {
    console.error('Ensemble chat failed:', error);
    session.ws.send(JSON.stringify({ type: 'ensemble_error', error: error.message }));
  }
}

"""

chat_start = content.find('\\nasync function handleEnsembleChat')
terminal_start = content.find('\\nasync function handleTerminalExecute')

if chat_start == -1 or terminal_start == -1:
    print('ERROR: markers not found chat=%d terminal=%d' % (chat_start, terminal_start))
    raise SystemExit(1)

new_content = content[:chat_start] + REAL_IMPL + content[terminal_start:]
with open('/app/bin/ensemble-web-fixed.js', 'w') as f:
    f.write(new_content)
print('Patched OK - replaced %d chars with real OpenRouter implementation' % (terminal_start - chat_start))
