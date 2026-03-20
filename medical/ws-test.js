// WebSocket Connection Test
import WebSocket from 'ws';

const wsUrl = `wss://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || 'KLbAOcDC09yLeg35Ksb4R'}`;

console.log('🧪 Testing WebSocket Connection...');
console.log('URL:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
    console.log('✅ WebSocket Connected!');
    ws.send(JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_subscribe",
        params: ["newHeads", {}]
    }));
});

ws.on('message', (data) => {
    const response = JSON.parse(data);
    console.log('📥 Message received:', response);
    if (response.method === 'eth_subscription') {
        console.log('🔔 New Block:', response.params.result.number);
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket Error:', error.message);
});

ws.on('close', (code, reason) => {
    console.log('🔌 WebSocket Closed:', code, reason?.toString());
});

// Keep alive
setTimeout(() => {
    console.log('⏰ Test completed');
    ws.close();
    process.exit(0);
}, 10000);