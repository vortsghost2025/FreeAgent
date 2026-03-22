/**
 * Qwen <-> Kilo Communication Bridge
 * Enables Qwen and Kilo to send messages via shared filesystem
 * 
 * Qwen can write to: agent-memory/shared-workspace/qwen-messages.json
 * Kilo reads from: agent-memory/shared-workspace/qwen-messages.json
 * Kilo responds via: agent-memory/shared-workspace/kilo-messages.json
 * Qwen reads from: agent-memory/shared-workspace/kilo-messages.json
 */
import fs from 'fs';
import path from 'path';

const MEMORY_DIR = path.join(process.cwd(), 'agent-memory', 'shared-workspace');

const QWEN_MAILBOX = path.join(MEMORY_DIR, 'qwen-messages.json');
const KILO_MAILBOX = path.join(MEMORY_DIR, 'kilo-messages.json');

// Ensure directory exists
if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
}

// Initialize mailboxes if they don't exist
[QWEN_MAILBOX, KILO_MAILBOX].forEach(file => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({ messages: [], lastRead: 0 }));
  }
});

/**
 * Send a message from Qwen to Kilo
 */
export function qwenToKilo(message) {
  const mailbox = JSON.parse(fs.readFileSync(QWEN_MAILBOX, 'utf-8'));
  mailbox.messages.push({
    from: 'qwen',
    to: 'kilo',
    content: message,
    timestamp: Date.now()
  });
  fs.writeFileSync(QWEN_MAILBOX, JSON.stringify(mailbox, null, 2));
  console.log(`[Qwen→Kilo] ${message}`);
}

/**
 * Send a message from Kilo to Qwen
 */
export function kiloToQwen(message) {
  const mailbox = JSON.parse(fs.readFileSync(KILO_MAILBOX, 'utf-8'));
  mailbox.messages.push({
    from: 'kilo',
    to: 'qwen',
    content: message,
    timestamp: Date.now()
  });
  fs.writeFileSync(KILO_MAILBOX, JSON.stringify(mailbox, null, 2));
  console.log(`[Kilo→Qwen] ${message}`);
}

/**
 * Read new messages for Kilo (from Qwen)
 */
export function readQwenMessages(lastRead = 0) {
  const mailbox = JSON.parse(fs.readFileSync(QWEN_MAILBOX, 'utf-8'));
  const newMessages = mailbox.messages.filter(m => m.timestamp > lastRead);
  const latestTimestamp = mailbox.messages.length > 0 
    ? mailbox.messages[mailbox.messages.length - 1].timestamp 
    : lastRead;
  
  return { messages: newMessages, latestTimestamp };
}

/**
 * Read new messages for Qwen (from Kilo)
 */
export function readKiloMessages(lastRead = 0) {
  const mailbox = JSON.parse(fs.readFileSync(KILO_MAILBOX, 'utf-8'));
  const newMessages = mailbox.messages.filter(m => m.timestamp > lastRead);
  const latestTimestamp = mailbox.messages.length > 0 
    ? mailbox.messages[mailbox.messages.length - 1].timestamp 
    : lastRead;
  
  return { messages: newMessages, latestTimestamp };
}

/**
 * Start polling for messages (for Kilo)
 */
export function startKiloPolling(callback, intervalMs = 2000) {
  let lastRead = 0;
  console.log('[KiloBridge] Polling for Qwen messages...');
  
  const interval = setInterval(() => {
    const { messages, latestTimestamp } = readQwenMessages(lastRead);
    if (messages.length > 0) {
      lastRead = latestTimestamp;
      messages.forEach(msg => {
        console.log('[KiloBridge] Received from Qwen:', msg.content);
        callback(msg);
      });
    }
  }, intervalMs);
  
  return () => clearInterval(interval);
}

// Default: if run directly, send a test message
if (process.argv[1]?.includes('qwen-kilo-bridge')) {
  const args = process.argv.slice(2);
  if (args[0] === 'send' && args[1]) {
    qwenToKilo(args.slice(1).join(' '));
  } else if (args[0] === 'poll') {
    startKiloPolling(msg => {
      console.log('[Kilo] Response needed for:', msg.content);
    });
  }
}

export default { qwenToKilo, kiloToQwen, readQwenMessages, readKiloMessages, startKiloPolling };