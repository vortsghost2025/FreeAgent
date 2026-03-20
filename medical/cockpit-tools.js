/**
 * Cockpit Tool Execution Module
 * 
 * Provides file read, write, and command execution capabilities
 * for the cockpit AI agents (Kilo, Claw)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory - restrict all operations to workspace (use process.cwd for actual workspace)
const WORKSPACE_DIR = process.cwd();

/**
 * Ensure path is within workspace (security)
 */
function isPathSafe(targetPath) {
  const resolved = path.resolve(targetPath);
  return resolved.startsWith(WORKSPACE_DIR);
}

/**
 * Read file contents
 */
export function readFile(filePath) {
  const fullPath = path.join(WORKSPACE_DIR, filePath);
  
  if (!isPathSafe(fullPath)) {
    return { success: false, error: 'Path outside workspace not allowed' };
  }
  
  if (!fs.existsSync(fullPath)) {
    return { success: false, error: 'File not found' };
  }
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    return { success: true, content, path: filePath };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Write/create file
 */
export function writeFile(filePath, content) {
  const fullPath = path.join(WORKSPACE_DIR, filePath);
  
  if (!isPathSafe(fullPath)) {
    return { success: false, error: 'Path outside workspace not allowed' };
  }
  
  try {
    // Ensure directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content, 'utf8');
    return { success: true, path: filePath, message: 'File created/updated successfully' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * List files in directory
 */
export function listFiles(dirPath = '') {
  const fullPath = path.join(WORKSPACE_DIR, dirPath);
  
  if (!isPathSafe(fullPath)) {
    return { success: false, error: 'Path outside workspace not allowed' };
  }
  
  if (!fs.existsSync(fullPath)) {
    return { success: false, error: 'Directory not found' };
  }
  
  try {
    const items = fs.readdirSync(fullPath, { withFileTypes: true });
    const files = items.map(item => ({
      name: item.name,
      type: item.isDirectory() ? 'directory' : 'file'
    }));
    return { success: true, files, path: dirPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Execute shell command
 */
export function executeCommand(command, cwd = WORKSPACE_DIR) {
  if (!isPathSafe(cwd)) {
    return { success: false, error: 'Working directory outside workspace not allowed' };
  }
  
  // Allowlist of safe commands - only these commands can be executed
  const ALLOWED_COMMANDS = [
    'npm', 'npx', 'node', 'git', 'python', 'python3', 'pip', 'pip3',
    'java', 'javac', 'go', 'cargo', 'rustc', 'make', 'cmake',
    'docker', 'docker-compose', 'kubectl', 'helm',
    'ls', 'dir', 'type', 'cat', 'echo', 'pwd', 'cd', 'mkdir', 'copy', 'move'
  ];

  // Blocklist of dangerous patterns (still check as secondary defense)
  const DANGEROUS_PATTERNS = [
    /rm\s+-rf/i, /del\s+\/f/i, /format\s+[a-z]:/i, /rd\s+\/s/i,
    /mkfs/i, /dd\s+if=/i, /;\s*rm/i, /\|\s*rm/i, /&&\s*rm/i,
    />\s*\/[a-z]/i, /curl.*\|\s*sh/i, /wget.*\|\s*sh/i
  ];

  // Validate command against allowlist first
  const parts = command.split(' ');
  const cmd = parts[0];

  if (!ALLOWED_COMMANDS.includes(cmd.toLowerCase())) {
    return { success: false, error: `Command '${cmd}' not allowed. Use: ${ALLOWED_COMMANDS.join(', ')}` };
  }

  // Secondary check: blocklist patterns
  if (DANGEROUS_PATTERNS.some(pattern => pattern.test(command))) {
    return { success: false, error: 'Command contains dangerous patterns' };
  }

  return new Promise((resolve) => {
    const args = parts.slice(1);
    
    const proc = spawn(cmd, args, { 
      cwd, 
      shell: false,  // Safe: no shell interpretation
      timeout: 30000,
      env: { ...process.env }  // Clean environment
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { 
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => { 
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        stdout: stdout.substring(0, 10000), // Limit output
        stderr: stderr.substring(0, 5000),
        exitCode: code
      });
    });

    proc.on('error', (e) => {
      resolve({
        success: false,
        error: e.message,
        stdout: '',
        stderr: e.message,
        exitCode: -1
      });
    });
  });
}
 export function detectToolRequest(message) {
  const lower = message.toLowerCase();
  
  console.log('[TOOL] detectToolRequest checking:', message);
  
  // File read patterns - more flexible
  const readMatch = message.match(/^read\s+(?:file\s+)?(.+)$/i) || 
                    message.match(/^open\s+(?:file\s+)?(.+)$/i) ||
                    message.match(/^show\s+(?:me\s+)?(?:the\s+)?(?:file\s+)?(.+)$/i);
  if (readMatch) {
    const filePath = readMatch[1].trim();
    console.log('[TOOL] Detected readFile, path:', filePath);
    return { tool: 'readFile', params: { filePath } };
  }
  
  // File write/create patterns
  const createMatch = message.match(/create\s+(?:file\s+)?(.+\.(?:js|ts|json|md|txt|html|css|py|java|cpp|h))\s+with\s+([\s\S]+)/i);
  if (createMatch) {
    return { tool: 'writeFile', params: { filePath: createMatch[1].trim(), content: createMatch[2].trim() } };
  }
  
  const writeMatch = message.match(/write\s+(?:to\s+)?(?:file\s+)?(.+\.(?:js|ts|json|md|txt|html|css|py|java|cpp|h))\s+[:\s]\s*([\s\S]+)/i);
  if (writeMatch) {
    return { tool: 'writeFile', params: { filePath: writeMatch[1].trim(), content: writeMatch[2].trim() } };
  }
  
  // List directory patterns
  if (lower.startsWith('list') || lower.startsWith('show me the files') || lower.startsWith('what files')) {
    const dirMatch = message.match(/list\s+(?:files\s+in\s+)?(?:directory\s+)?(.+)/i);
    return { tool: 'listFiles', params: { dirPath: dirMatch ? dirMatch[1].trim() : '' } };
  }
  
  // Command execution patterns
  const runMatch = message.match(/run\s+(?:command\s+)?(.+)/i);
  if (runMatch && (lower.includes('npm') || lower.includes('node') || lower.includes('git') || lower.includes('npx'))) {
    return { tool: 'executeCommand', params: { command: runMatch[1].trim() } };
  }
  
  return null; // No tool request detected
}

/**
 * Execute tool and return result
 */
export async function executeTool(tool, params) {
  switch (tool) {
    case 'readFile':
      return readFile(params.filePath);
    case 'writeFile':
      return writeFile(params.filePath, params.content);
    case 'listFiles':
      return listFiles(params.dirPath);
    case 'executeCommand':
      return await executeCommand(params.command);
    default:
      return { success: false, error: 'Unknown tool: ' + tool };
  }
}

