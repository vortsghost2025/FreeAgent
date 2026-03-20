#!/usr/bin/env node
// Simple test to verify agent works without UI
import { CodingAgent } from './src/agent.js';

console.log('🧪 Testing Free Coding Agent...\n');

try {
  const agent = new CodingAgent({
    provider: 'ollama',
    model: 'llama3.1:8b',
    workingDir: process.cwd(),
    requiresApproval: false
  });

  console.log('✓ Agent created');
  console.log('✓ Checking provider availability...');

  const available = await agent.isAvailable();
  if (!available) {
    console.log('✗ Provider not available');
    process.exit(1);
  }
  console.log('✓ Provider is available\n');

  console.log('Testing simple response...');
  let response = '';
  for await (const chunk of agent.provider.chat('Say hello', { systemPrompt: false })) {
    response += chunk;
    process.stdout.write(chunk);
  }
  console.log('\n\n✓ Test completed successfully!\n');

} catch (error) {
  console.error('✗ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
