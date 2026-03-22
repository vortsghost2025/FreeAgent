#!/usr/bin/env node
/**
 * Claw Standalone Runtime
 * Independent version of Claw that works without the cockpit server
 * Can run on ClawAI, locally, or anywhere without shared workspace dependencies
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standalone memory file
const STANDALONE_MEMORY_FILE = path.join(__dirname, 'agent-memory', 'claw-standalone.json');

/**
 * Standalone Claw Agent Class
 * Completely independent of cockpit infrastructure
 */
class ClawStandalone {
  constructor() {
    this.agentId = 'claw-standalone';
    this.name = 'Claw Standalone Agent';
    this.memory = this.loadMemory();
    this.sessionHistory = [];
    console.log(`🤖 ${this.name} initialized - ready for independent operation`);
  }

  /**
   * Load standalone memory (isolated from cockpit memory)
   */
  loadMemory() {
    try {
      if (fs.existsSync(STANDALONE_MEMORY_FILE)) {
        const data = fs.readFileSync(STANDALONE_MEMORY_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.warn('⚠️ Could not load standalone memory:', err.message);
    }
    
    // Return default structure
    return {
      agent: 'claw-standalone',
      sessions: [],
      settings: {
        memoryIsolation: true,
        noSharedWorkspace: true,
        noCommitLocks: true,
        noOvermind: true,
        independentRuntime: true
      }
    };
  }

  /**
   * Save standalone memory
   */
  saveMemory() {
    try {
      this.memory.lastUpdated = new Date().toISOString();
      fs.writeFileSync(STANDALONE_MEMORY_FILE, JSON.stringify(this.memory, null, 2));
      return true;
    } catch (err) {
      console.error('❌ Error saving standalone memory:', err.message);
      return false;
    }
  }

  /**
   * Add session to memory
   */
  addSession(message, response) {
    const session = {
      timestamp: new Date().toISOString(),
      message,
      response,
      sessionId: `standalone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.memory.sessions.push(session);
    
    // Keep last 50 sessions
    if (this.memory.sessions.length > 50) {
      this.memory.sessions = this.memory.sessions.slice(-50);
    }

    this.saveMemory();
    return session;
  }

  /**
   * Process user input and generate response
   */
  async processInput(input) {
    console.log(`📥 Processing input: "${input}"`);
    
    // Simple response logic - in a real implementation, this would connect to LLM
    let response = await this.generateResponse(input);
    
    // Add to session history
    this.addSession(input, response);
    
    return response;
  }

  /**
   * Generate response (placeholder - would connect to actual LLM in production)
   */
  async generateResponse(input) {
    // Simple pattern matching for demonstration
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
      return "Hello! I'm Claw Standalone, your independent AI assistant. I can work anywhere - with or without the cockpit running.";
    }
    
    if (lowerInput.includes('help')) {
      return "I'm here to help! I'm the standalone version of Claw, designed to work independently. I don't need the cockpit server to be running. What can I assist you with?";
    }
    
    if (lowerInput.includes('cockpit') || lowerInput.includes('server')) {
      return "I notice you mentioned the cockpit. As a standalone agent, I work completely independently. I have my own memory, no shared workspace dependencies, and no need for the cockpit server to be running.";
    }
    
    if (lowerInput.includes('memory')) {
      return `I'm using standalone memory isolation. I have ${this.memory.sessions.length} sessions stored in my isolated memory file. This prevents any conflicts with the cockpit version of Claw.`;
    }
    
    // Default response
    return "I understand you're saying: '" + input + "'. As your standalone assistant, I'm ready to help with any tasks or questions you have. I work independently of the cockpit infrastructure.";
  }

  /**
   * Get session summary
   */
  getSessionSummary() {
    return {
      agent: this.agentId,
      totalSessions: this.memory.sessions.length,
      lastUpdated: this.memory.lastUpdated,
      settings: this.memory.settings
    };
  }

  /**
   * Clear session history
   */
  clearHistory() {
    this.memory.sessions = [];
    this.saveMemory();
    console.log('🗑️ Session history cleared');
  }
}

/**
 * Interactive REPL for standalone Claw
 */
async function startREPL() {
  const claw = new ClawStandalone();
  
  console.log(`
🚀 Claw Standalone Runtime Started
==================================
✅ Independent operation mode
✅ No cockpit dependencies  
✅ Isolated memory
✅ Works anywhere - cockpit running or not

Commands:
- 'exit' or 'quit' - Exit the program
- 'clear' - Clear session history
- 'status' - Show agent status
- 'help' - Show this help

Ready for input:
`);

  // Simple REPL loop
  const readline = (await import('readline')).createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = () => {
    readline.question('> ', async (input) => {
      input = input.trim();
      
      if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
        console.log('👋 Goodbye!');
        readline.close();
        return;
      }
      
      if (input.toLowerCase() === 'clear') {
        claw.clearHistory();
        askQuestion();
        return;
      }
      
      if (input.toLowerCase() === 'status') {
        const status = claw.getSessionSummary();
        console.log('\n📊 Agent Status:');
        console.log(`  Agent ID: ${status.agent}`);
        console.log(`  Sessions: ${status.totalSessions}`);
        console.log(`  Last Updated: ${status.lastUpdated}`);
        console.log(`  Settings: ${JSON.stringify(status.settings, null, 2)}`);
        console.log('');
        askQuestion();
        return;
      }
      
      if (input.toLowerCase() === 'help') {
        console.log(`
📚 Claw Standalone Help
=======================
This is the independent version of Claw that works without the cockpit.

Features:
• Works with or without cockpit server running
• Independent memory storage
• No shared workspace conflicts
• Compatible with ClawAI platform
• Standalone REPL interface

Try asking me about:
- General assistance
- Memory management  
- Standalone capabilities
- Anything else!
`);
        askQuestion();
        return;
      }
      
      try {
        const response = await claw.processInput(input);
        console.log(`\n🤖 ${response}\n`);
      } catch (err) {
        console.error('❌ Error processing input:', err.message);
      }
      
      askQuestion();
    });
  };

  askQuestion();
}

// Export for programmatic use
export { ClawStandalone };

// Run REPL when executed directly
startREPL();

/**
 * Programmatic API for external use
 */
export class ClawAPI {
  constructor() {
    this.claw = new ClawStandalone();
  }

  async chat(message) {
    return await this.claw.processInput(message);
  }

  getStatus() {
    return this.claw.getSessionSummary();
  }

  clearHistory() {
    this.claw.clearHistory();
  }
}

// Run REPL if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startREPL().catch(console.error);
}

export default ClawStandalone;