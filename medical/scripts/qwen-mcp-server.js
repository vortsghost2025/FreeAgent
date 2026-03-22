#!/usr/bin/env node
console.log("🚀 Qwen Strategist MCP Server Starting...");
console.log(`✅ Model: ${process.env.MODEL_NAME || 'qwen-max'}`);
console.log(`✅ API Key Loaded: ${process.env.DASHSCOPE_API_KEY ? 'Yes' : 'No'}`);

// Keep the process alive for VS Code to connect
process.stdin.resume();

process.stdin.on('data', (data) => {
    try {
        const msg = JSON.parse(data.toString());
        console.error(`[Qwen MCP] Received request: ${msg.method || 'unknown'}`);
        
        // Acknowledge immediately
        const response = {
            jsonrpc: "2.0",
            id: msg.id || 1,
            result: {
                content: [{ type: "text", text: "Qwen Strategist Online. Ready for swarm coordination." }]
            }
        };
        process.stdout.write(JSON.stringify(response) + "\n");
    } catch (e) {
        console.error("Error parsing MCP message:", e);
    }
});
