const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let lastRateLimit = 0;

export async function rpcCall(fn, ...args) {
    try {
        return await fn(...args);
    } catch (err) {
        if (err.message?.includes("rate limit") || err.code === -32005) {
            const now = Date.now();
            if (now - lastRateLimit > 50) {
                lastRateLimit = now;
                await sleep(100); // micro-backoff
            }
            return await fn(...args); // retry once
        }
        throw err;
    }
}
