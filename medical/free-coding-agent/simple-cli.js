#!/usr/bin/env node
/**
 * SIMPLE CLI - Working version without inquirer issues
 * Uses readline directly for Node.js 24 compatibility
 */

import { CodingAgent } from './src/agent.js';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askQuestion(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n🤖 Free Coding Agent - Simple CLI');
  console.log('Provider: ollama (llama3.1:8b)');
  console.log('Working: ' + process.cwd());
  console.log('\nCommands: "exit" to quit, "clear" to reset\n');

  const agent = new CodingAgent({
    provider: 'ollama',
    model: 'llama3.1:8b',
    workingDir: process.cwd(),
    requiresApproval: false,
    onToolCall: (tool, params, result) => {
      console.log(`\n🔧 Tool: ${tool}`);
      if (result.success) {
        console.log('✓ Success');
      } else {
        console.log('✗', result.error);
      }
    }
  });

  const available = await agent.isAvailable();
  if (!available) {
    console.error('\n✗ Ollama is not available. Make sure it\'s running:');
    console.error('  ollama serve');
    process.exit(1);
  }

  while (true) {
    const message = await askQuestion('You: ');

    if (message.toLowerCase() === 'exit') {
      console.log('\nGoodbye!');
      break;
    }

    if (message.toLowerCase() === 'clear') {
      agent.reset();
      console.log('\n✓ Conversation cleared\n');
      continue;
    }

    if (!message.trim()) continue;

    process.stdout.write('\nAssistant: ');

    try {
      for await (const event of agent.process(message)) {
        if (event.type === 'chunk') {
          process.stdout.write(event.content);
        } else if (event.type === 'tool') {
          // Tool execution is already shown via onToolCall
        } else if (event.type === 'approval_required') {
          console.log(`\n⚠️  Approval required: ${event.tool}`);
          const approved = await askQuestion('Approve? (y/n): ');
          if (approved.toLowerCase() === 'y') {
            process.stdout.write('\nAssistant: ');
            for await (const contEvent of agent.continue(true)) {
              if (contEvent.type === 'chunk') {
                process.stdout.write(contEvent.content);
              }
            }
          } else {
            console.log('\n✗ Operation cancelled');
            break;
          }
        } else if (event.type === 'complete') {
          process.stdout.write('\n');
        }
      }
    } catch (error) {
      console.error('\n✗ Error:', error.message);
    }

    console.log('\n');
  }

  rl.close();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
