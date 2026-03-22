// Quick status check - shows current bot state
import 'dotenv/config';
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const EXECUTOR = process.env.EXECUTOR_ADDRESS;
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

const wethAbi = ["function balanceOf(address) view returns (uint256)"];
const weth = new ethers.Contract(WETH, wethAbi, provider);

async function check() {
  console.log("═".repeat(50));
  console.log("📊 MEV SWARM STATUS");
  console.log("═".repeat(50));
  
  const walletEth = await provider.getBalance(wallet.address);
  const walletWeth = await weth.balanceOf(wallet.address);
  const executorWeth = await weth.balanceOf(EXECUTOR);
  
  console.log(`\n💰 Wallet: ${wallet.address.slice(0,6)}...${wallet.address.slice(-4)}`);
  console.log(`   ETH:  ${ethers.formatEther(walletEth).slice(0,10)} ETH`);
  console.log(`   WETH: ${ethers.formatEther(walletWeth).slice(0,10)} WETH`);
  
  console.log(`\n📋 Executor: ${EXECUTOR.slice(0,6)}...${EXECUTOR.slice(-4)}`);
  console.log(`   WETH: ${ethers.formatEther(executorWeth).slice(0,10)} WETH`);
  
  const totalWeth = walletWeth + executorWeth;
  console.log(`\n📈 Total WETH available: ${ethers.formatEther(totalWeth).slice(0,10)}`);
  
  if (totalWeth > 0) {
    console.log("\n✅ SYSTEM READY - WETH available for trading");
  } else {
    console.log("\n❌ NO WETH - Run: node wrap-eth.cjs");
  }
  console.log("═".repeat(50));
}

check().catch(console.error);
