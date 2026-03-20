// wrap-eth.cjs - Wrap ETH to WETH on Base network
const { ethers } = require("ethers");
require('dotenv').config();

const RPC_URL = process.env.BASE_RPC_URL || "https://base-rpc.publicnode.com";

// Check for private key
if (!process.env.PRIVATE_KEY) {
  console.log("❌ Error: PRIVATE_KEY not found in .env file");
  console.log("\n📝 Setup steps:");
  console.log("1. Copy .env.example to .env");
  console.log("2. Add your Base wallet private key to .env");
  console.log("3. Run: node wrap-eth.cjs\n");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// WETH on Base
const WETH = "0x4200000000000000000000000000000000000006";
const WETH_ABI = ["function deposit() payable", "function balanceOf(address) view returns (uint256)"];

async function wrapETH(amount) {
  console.log("\n🔄 Wrapping ETH to WETH on Base");
  console.log("==============================");
  console.log(`Wallet: ${wallet.address}`);
  console.log(`Amount: ${amount} ETH`);
  
  try {
    // Check ETH balance
    const ethBalance = await provider.getBalance(wallet.address);
    console.log(`\n💰 Current ETH balance: ${ethers.formatEther(ethBalance)} ETH`);
    
    const amountWei = ethers.parseEther(amount);
    
    if (ethBalance < amountWei) {
      console.log(`\n❌ Error: Insufficient ETH balance`);
      console.log(`   Have: ${ethers.formatEther(ethBalance)} ETH`);
      console.log(`   Need: ${amount} ETH`);
      process.exit(1);
    }
    
    // Wrap ETH
    const weth = new ethers.Contract(WETH, WETH_ABI, wallet);
    
    console.log(`\n📤 Sending deposit transaction...`);
    const tx = await weth.deposit({ 
      value: amountWei,
      gasLimit: 100000 
    });
    
    console.log(`⏳ Transaction sent: ${tx.hash}`);
    console.log(`Waiting for confirmation...`);
    
    const receipt = await tx.wait();
    
    // Check WETH balance
    const wethBalance = await weth.balanceOf(wallet.address);
    
    console.log(`\n✅ SUCCESS!`);
    console.log(`💰 WETH Balance: ${ethers.formatEther(wethBalance)}`);
    console.log(`🔗 View on BaseScan: https://basescan.org/tx/${tx.hash}`);
    console.log(`\n==============================\n`);
    
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Tip: Make sure you have ETH for gas (about $0.50 worth)");
    }
    process.exit(1);
  }
}

// Get amount from command line or default to 0.01 ETH
const amount = process.argv[2] || "0.01";
wrapETH(amount);
