# REMOVED: sensitive data redacted by automated security cleanup
import { ethers } from 'ethers';
import { rpcCall } from "./rpc.js";
import { getToken, setToken } from "./cache.js";

export const COMMON_TOKENS = {
    "REDACTED_ADDRESS": { symbol: "WETH", decimals: 18 },
    "REDACTED_ADDRESS": { symbol: "USDC", decimals: 6 },
    "REDACTED_ADDRESS": { symbol: "USDT", decimals: 6 },
    "REDACTED_ADDRESS": { symbol: "DAI", decimals: 18 }
};

export async function resolveToken(address, provider) {
    address = address.toLowerCase();

    // Check cache first
    const cached = getToken(address);
    if (cached) return cached;

    // Check COMMON_TOKENS
    if (COMMON_TOKENS[address]) {
        const data = COMMON_TOKENS[address];
        setToken(address, data);
        return data;
    }

    // Fallback: fetch from chain (parallel calls to reduce RPC load)
    try {
        const erc20 = new ethers.Contract(address, [
            { "constant": true, "inputs": [], "name": "symbol", "outputs": [{ "name": "", "type": "string" }] },
            { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "name": "", "type": "uint8" }] }
        ], provider);

        const [symbol, decimals] = await Promise.all([
            rpcCall(() => erc20.symbol()),
            rpcCall(() => erc20.decimals())
        ]);
        const data = { symbol, decimals };
        setToken(address, data);
        return data;
    } catch (err) {
        return { symbol: "UNKNOWN", decimals: 18 };
    }
}
