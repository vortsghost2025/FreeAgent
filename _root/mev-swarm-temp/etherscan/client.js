import axios from 'axios';

const API_KEY = process.env.WRSVYWK6PC6K5MPYSMHYKH3764XWMISG3D;
const BASE = 'https://api.etherscan.io/v2/api';

export async function callEtherscan(params) {
    const url = BASE + '?' + new URLSearchParams({ chainid: '1', ...params, apikey: API_KEY });
    try {
        const res = await axios.get(url, { timeout: 5000 });
        return res.data.status === '1' ? res.data.result : null;
    } catch { return null; }
}

export async function getBlockNumber() {
    return callEtherscan({ module: 'proxy', action: 'eth_blockNumber' });
}

export async function getBlockByNumber(block, includeTxs = true) {
    return callEtherscan({ module: 'proxy', action: 'eth_getBlockByNumber', tag: block, boolean: includeTxs });
}

export async function getTxsByAddress(addr, startBlock = 0, endBlock = 'latest', page = 1, offset = 100) {
    return callEtherscan({
        module: 'account',
        action: 'txlist',
        address: addr,
        startblock: startBlock,
        endblock: endBlock,
        page,
        offset,
        sort: 'desc'
    });
}