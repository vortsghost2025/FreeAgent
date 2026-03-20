const poolCache = new Map();
const tokenCache = new Map();

export function getPool(address) {
    return poolCache.get(address.toLowerCase());
}

export function setPool(address, data) {
    poolCache.set(address.toLowerCase(), data);
}

export function getToken(address) {
    const key = address.toLowerCase();
    const cached = tokenCache.get(key);
    if (cached) {
        if (process.env.DEBUG_LOGS === 'true') {
            console.log(`✅ Token Cache HIT: ${key}`);
        }
    }
    return cached;
}

export function setToken(address, data) {
    const key = address.toLowerCase();
    tokenCache.set(key, data);
    if (process.env.DEBUG_LOGS === 'true') {
        console.log(`💾 Token Cache SET: ${key} → ${data.symbol}`);
    }
}
