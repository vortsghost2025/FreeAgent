import { ethers } from '"'"'"'ethers'"';
import '"'"'dotenv'"'/'config'"';

const wallet = new ethers.Wallet('"'"'process.env.PRIVATE_KEY'"');
const provider = new ethers.JsonRpcProvider('"'"'process.env.MAINNET_RPC_URL'"');

console.log("Simple test - checking if basic execution works");
console.log("Wallet:", wallet.address);
process.exit(0);
