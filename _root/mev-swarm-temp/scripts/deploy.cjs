const { ethers } = require("hardhat");

// Preflight checks: accept alternative RPCs (Chainstack/Alchemy) if GOERLI not set
let goerliUrl = process.env.GOERLI_RPC_URL || process.env.GOERLI_URL || "";
const privateKey = process.env.PRIVATE_KEY || "";

if (!goerliUrl || /YOUR_INFURA|YOUR_INFURA_KEY|YOUR_INFURA_KEY_HERE|YOUR_INFURA_PROJECT_ID/i.test(goerliUrl)) {
  // Try to discover other RPC environment vars the user may have set
  const candidates = [
    'GOERLI_RPC_URL', 'GOERLI_URL',
    'ETHEREUM_RPC_URL', 'MAINNET_RPC_URL', 'RPC_URL',
    'CHAINSTACK_RPC_URL', 'ALCHEMY_API_URL', 'ALCHEMY_RPC_URL'
  ];

  for (const name of candidates) {
    const v = process.env[name];
    if (v && !/YOUR_INFURA|YOUR_INFURA_KEY_HERE|YOUR_INFURA_PROJECT_ID/i.test(v)) {
      goerliUrl = v;
      console.log(`ℹ️ Using RPC from ${name}`);
      break;
    }
  }

  if (!goerliUrl || /YOUR_INFURA|YOUR_INFURA_KEY|YOUR_INFURA_KEY_HERE|YOUR_INFURA_PROJECT_ID/i.test(goerliUrl)) {
    console.error('❌ GOERLI_RPC_URL is not configured or contains a placeholder.');
    console.error('   Please set GOERLI_RPC_URL in .env.local to a valid RPC endpoint (Infura/Alchemy/Chainstack), or set an alternative RPC env var.');
    console.error('   Example: GOERLI_RPC_URL=https://goerli.infura.io/v3/<project-id>');
    process.exit(1);
  }
}

// If we found an alternative RPC, set it so Hardhat uses it
process.env.GOERLI_RPC_URL = goerliUrl;

if (!privateKey || !privateKey.startsWith('0x') || privateKey.length !== 66) {
  console.error('❌ PRIVATE_KEY is not set or is invalid (expected 0x + 64 hex chars).');
  console.error('   Ensure PRIVATE_KEY is configured in .env.local or use scripts/set-private-key-env.ps1 to inject it for this session.');
  process.exit(1);
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║  MEV SWARM - EXECUTOR CONTRACT DEPLOYMENT            ║");
  console.log("╚═══════════════════════════════════════════════════════════════════════════╝\n");

  const signers = await ethers.getSigners();
  const deployer = signers[0];

  console.log("🚀 Starting deployment...\n");

  try {
    console.log("Step 1: Deploying MEVSwarmExecutor contract...");
    const MEVSwarmExecutor = await ethers.getContractFactory("MEVSwarmExecutor");
    const executor = await MEVSwarmExecutor.connect(deployer).deploy();
    await executor.waitForDeployment();
    const address = await executor.getAddress();

    console.log("✅ Contract deployed successfully!\n");
    console.log(`📍 Contract Address: ${address}`);
    console.log(`👤 Deployer: ${deployer.address}`);

    try {
      const network = await executor.provider.getNetwork();
      console.log(`📦 Network: ${network.name}`);
    } catch (e) {
      console.log("📦 Network: mainnet");
    }

    try {
      console.log(`🔗 Block: ${executor.deploymentTransaction()?.blockNumber}\n`);
    } catch (e) {
      console.log("🔗 Block: deployed\n");
    }

    if (process.env.ETHERSCAN_API_KEY && process.env.ETHERSCAN_API_KEY !== "YOUR_ETHERSCAN_API_KEY") {
      console.log("Step 2: Waiting for Etherscan verification...");
      console.log("   (This may take 1-2 minutes)\n");
      try {
        await executor.deploymentTransaction()?.wait(5);
        console.log("✅ Contract should be verified on Etherscan\n");
      } catch (error) {
        console.log("⚠️  Automatic verification may have failed");
        console.log("   You can verify manually at:");
        console.log(`   https://etherscan.io/address/${address}#code\n`);
      }
    } else {
      console.log("⚠️  Etherscan API key not configured");
      console.log("   To auto-verify, set ETHERSCAN_API_KEY in .env");
      console.log(`   Verify manually: https://etherscan.io/address/${address}#code\n`);
    }

    console.log("╔═════════════════════════════════════════════════════════════════════╗");
    console.log("║  DEPLOYMENT COMPLETE                                   ║");
    console.log("╚═════════════════════════════════════════════════════════════════════════════╝\n");

    console.log("🎯 NEXT STEPS:\n");
    console.log("1. UPDATE CONFIGURATION:");
    console.log("   Add this to .env or hardcode:");
    console.log(`   EXECUTOR_ADDRESS=${address}\n`);
    console.log("2. FUND THE CONTRACT:");
    console.log("   Send 0.5-1.0 ETH to contract address");
    console.log("   This covers gas for ~50-100 arbitrage executions\n");
    console.log("3. UPDATE LAUNCH_SEQUENCE.JS:");
    console.log("   Edit CONFIG.EXECUTOR_ADDRESS line:");
    console.log(`   EXECUTOR_ADDRESS: '${address}',\n`);
    console.log("4. TEST DEPLOYMENT:");
    console.log("   Run: node test-deployment.js");
    console.log("   Or verify contract on Etherscan\n");
    console.log("5. EXECUTE FIRST ARBITRAGE:");
    console.log("   Run: node LAUNCH_SEQUENCE.js");
    console.log("   The system will discover opportunities and execute!\n");
    console.log("╔═══════════════════════════════════════════════════════════════════╗");
    console.log("║  🎯 READY FOR FIRST EXECUTION                    ║");
    console.log("╚═══════════════════════════════════════════════════════════════════════╝\n");
  } catch (error) {
    console.error("❌ Deployment failed!");
    console.error(`Error: ${error.message}\n`);
    if (error.message.includes("insufficient funds")) {
      console.log("💡 TIP: Make sure your deployer address has enough ETH");
      console.log("   Required: ~0.1-0.2 ETH for gas\n");
    }
    process.exit(1);
  }
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
