import { ethers } from 'ethers';
import { rpcCall } from "./rpc.js";
import { getToken, setToken } from "./cache.js";

export const COMMON_TOKENS = {
    "0xC02aaa39b223FE8D0A0e5C4F27eAD9083C756Cc2": { symbol: "WETH", decimals: 18 },
    "0xA0b86991c6218b36c1d19D4a2e9eb0ce3606eb48": { symbol: "USDC", decimals: 6 },
    "0xdAC17F958D2ee523a2206206994597C13D831ec7": { symbol: "USDT", decimals: 6 },
    "0x6B175474E89094C44Da98b954EedeAC495271d0F": { symbol: "DAI", decimals: 18 }
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
