import * as vscode from "vscode";
import { spawn } from "child_process";
import * as path from "path";

let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("Free Coding Agent");

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.text = "$(hubot) FCA";
  statusBarItem.tooltip = "Free Coding Agent";
  statusBarItem.command = "freeCodingAgent.chat";
  statusBarItem.show();

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("freeCodingAgent.chat", openChat),
    vscode.commands.registerCommand("freeCodingAgent.explain", () =>
      processSelection("explain"),
    ),
    vscode.commands.registerCommand("freeCodingAgent.fix", () =>
      processSelection("fix"),
    ),
    vscode.commands.registerCommand("freeCodingAgent.refactor", () =>
      processSelection("refactor"),
    ),
  );

  outputChannel.appendLine("Free Coding Agent activated");
}

async function openChat() {
  const panel = vscode.window.createWebviewPanel(
    "freeCodingAgentChat",
    "Free Coding Agent",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  );

  panel.webview.html = getWebviewContent();

  // Handle messages from webview
  panel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.type) {
        case "chat":
          await handleChat(message.content, panel.webview);
          break;
        case "init":
          panel.webview.postMessage({ type: "ready" });
          break;
      }
    },
    undefined,
    [],
  );
}

async function handleChat(content: string, webview: vscode.Webview) {
  const config = vscode.workspace.getConfiguration("freeCodingAgent");
  const provider = config.get<string>("provider", "ollama");
  const model = config.get<string>("model", "llama3.2");

  webview.postMessage({
    type: "response",
    content: `Using ${provider} with model ${model}...\n\n`,
  });

  // For now, show a placeholder response
  // In a real implementation, you would spawn the CLI or call the API directly
  webview.postMessage({
    type: "response",
    content: `I received your message: "${content}"\n\nTo use this extension, make sure the Free Coding Agent CLI is installed and configured.\n\nProvider: ${provider}\nModel: ${model}`,
  });

  webview.postMessage({ type: "done" });
}

async function processSelection(action: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor");
    return;
  }

  const selection = editor.selection;
  const selectedText = editor.document.getText(selection);

  if (!selectedText) {
    vscode.window.showErrorMessage("No text selected");
    return;
  }

  const prompts: Record<string, string> = {
    explain: "Explain this code:",
    fix: "Fix any issues in this code:",
    refactor: "Refactor this code to be cleaner and more efficient:",
  };

  const prompt = prompts[action] || "Process this code:";

  // Open chat with the selection
  await vscode.commands.executeCommand("freeCodingAgent.chat");

  // The webview will need to be sent the initial message
  // This is a simplified version
  vscode.window.showInformationMessage(
    `${prompt} (Selected ${selectedText.length} characters)`,
  );
}

function getWebviewContent(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Free Coding Agent</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 10px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        #messages {
            height: 400px;
            overflow-y: auto;
            border: 1px solid var(--vscode-input-border);
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 4px;
        }
        .message {
            margin-bottom: 10px;
            padding: 8px;
            border-radius: 4px;
        }
        .user { background: var(--vscode-input-background); }
        .assistant { background: var(--vscode-editor-inactiveSelectionBackground); }
        #input-container {
            display: flex;
            gap: 10px;
        }
        textarea {
            flex: 1;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            resize: none;
        }
        button {
            padding: 8px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <h3>Free Coding Agent</h3>
    <div id="messages"></div>
    <div id="input-container">
        <textarea id="input" rows="3" placeholder="Type your message..."></textarea>
        <button id="send">Send</button>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        const messages = document.getElementById('messages');
        const input = document.getElementById('input');
        const sendBtn = document.getElementById('send');
        
        function addMessage(role, content) {
            const div = document.createElement('div');
            div.className = 'message ' + role;
            div.textContent = content;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
        }
        
        sendBtn.addEventListener('click', () => {
            const text = input.value.trim();
            if (!text) return;
            
            addMessage('user', text);
            vscode.postMessage({ type: 'chat', content: text });
            input.value = '';
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendBtn.click();
            }
        });
        
        window.addEventListener('message', (event) => {
            const data = event.data;
            if (data.type === 'response') {
                const lastMsg = messages.lastChild;
                if (lastMsg && lastMsg.classList.contains('assistant')) {
                    lastMsg.textContent += data.content;
                } else {
                    addMessage('assistant', data.content);
                }
                messages.scrollTop = messages.scrollHeight;
            } else if (data.type === 'done') {
                // Response complete
            } else if (data.type === 'ready') {
                addMessage('system', 'Ready! Configure your provider in VS Code settings.');
            }
        });
        
        // Initialize
        vscode.postMessage({ type: 'init' });
    </script>
</body>
</html>`;
}

export function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}
