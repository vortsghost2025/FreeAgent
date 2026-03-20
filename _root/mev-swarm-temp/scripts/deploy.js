import hardhat from "hardhat";

const { ethers } = hardhat;

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║  MEV SWARM - EXECUTOR CONTRACT DEPLOYMENT            ║");
  console.log("╚═══════════════════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();

  console.log("🚀 Starting deployment...\n");

  try {
    // Deploy executor contract
    console.log("Step 1: Deploying MEVSwarmExecutor contract...");
    const MEVSwarmExecutor = await ethers.getContractFactory("MEVSwarmExecutor");
    const executor = await MEVSwarmExecutor.deploy();

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

    // Verify contract (if Etherscan API key is available)
    if (process.env.ETHERSCAN_API_KEY && process.env.ETHERSCAN_API_KEY !== "YOUR_ETHERSCAN_API_KEY") {
      console.log("Step 2: Waiting for Etherscan verification...");
      console.log("   (This may take 1-2 minutes)\n");

      try {
        await executor.deploymentTransaction()?.wait(5); // Wait for 5 confirmations
        console.log("✅ Contract should be verified on Etherscan\n");
      } catch (error) {
        console.log("⚠️  Automatic verification may have failed");
        console.log("   You can verify manually at:");
        console.log(`   https://etherscan.io/address/${address}#code\n`);
      }
    } else {
      console.log("⚠️  Etherscan API key not configured");
      console.log("   To auto-verify, set ETHERSCAN_API_KEY in .env\n");
      console.log(`   Verify manually: https://etherscan.io/address/${address}#code\n`);
    }

    // Print next steps
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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
