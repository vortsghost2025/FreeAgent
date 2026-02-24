# Free Coding Agent

A free, open-source coding agent like Claude Code with multiple LLM backends.

## Features

- **Multiple LLM Backends**: Supports Ollama (local), Groq (cloud), and Together AI (cloud)
- **Tool System**: File operations, command execution, and code search
- **Multiple Interfaces**: CLI, Web UI, and VS Code extension
- **Streaming Responses**: Real-time streaming from all providers
- **Safe Mode**: Approval required for destructive operations

## Quick Start

### Installation

```bash
cd free-coding-agent
npm install
```

### CLI Usage

```bash
# Start interactive chat (default: Ollama)
npm start

# Use a specific provider
npm start -- -p groq
npm start -- -p together

# Specify a model
npm start -- -m llama3.2

# Set working directory
npm start -- -w /path/to/project

# Disable approval for commands
npm start -- --no-approval
```

### Web UI

```bash
# Start web server
npm run web

# Open http://localhost:3000 in your browser
```

### VS Code Extension

1. Navigate to `vscode-extension` directory
2. Run `npm install && npm run compile`
3. Open VS Code and press F5 to launch extension development host

## Provider Configuration

### Ollama (Local)

1. Install Ollama: https://ollama.ai
2. Pull a model: `ollama pull llama3.2`
3. Run the agent: `npm start`

### Groq (Cloud)

1. Get API key: https://console.groq.com
2. Set environment variable: `export GROQ_API_KEY=your_key`
3. Run: `npm start -- -p groq`

### Together AI (Cloud)

1. Get API key: https://api.together.xyz
2. Set environment variable: `export TOGETHER_API_KEY=your_key`
3. Run: `npm start -- -p together`

## Available Tools

The agent can use the following tools:

| Tool | Description |
|------|-------------|
| `read_file` | Read file contents |
| `write_to_file` | Create or overwrite files |
| `replace_in_file` | Make targeted edits to files |
| `list_files` | List directory contents |
| `search_files` | Search with regex patterns |
| `execute_command` | Run shell commands |
| `ask_followup_question` | Ask user for clarification |

## Architecture

```
free-coding-agent/
├── bin/
│   ├── cli.js          # CLI entry point
│   └── web.js          # Web server
├── public/
│   └── index.html      # Web UI
├── src/
│   ├── agent.js        # Main agent class
│   ├── index.js        # Exports
│   ├── providers/      # LLM providers
│   │   ├── base.js     # Base provider
│   │   ├── ollama.js   # Ollama provider
│   │   ├── groq.js     # Groq provider
│   │   └── together.js # Together AI provider
│   └── tools/          # Tool implementations
│       ├── base.js     # Base tool
│       ├── read-file.js
│       ├── write-file.js
│       ├── replace-file.js
│       ├── list-files.js
│       ├── search-files.js
│       ├── execute-command.js
│       ├── ask-question.js
│       ├── parser.js   # Tool parser
│       └── executor.js # Tool executor
└── vscode-extension/   # VS Code extension
```

## API Usage

```javascript
import { CodingAgent } from './src/index.js';

const agent = new CodingAgent({
  provider: 'ollama',
  model: 'llama3.2',
  workingDir: process.cwd()
});

// Process a message
for await (const event of agent.process('Create a hello world program')) {
  if (event.type === 'chunk') {
    process.stdout.write(event.content);
  } else if (event.type === 'tool') {
    console.log(`Tool: ${event.tool}`);
  }
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key |
| `TOGETHER_API_KEY` | Together AI API key |
| `OLLAMA_URL` | Ollama server URL (default: http://localhost:11434) |
| `PORT` | Web server port (default: 3000) |

## Development

```bash
# Run tests
npm test

# Lint code
npm run lint
```

## License

MIT

## Contributing

Pull requests are welcome! Please read the contributing guidelines first.