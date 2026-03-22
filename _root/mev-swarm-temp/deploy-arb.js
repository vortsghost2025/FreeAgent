const { ethers } from 'ethers';
import 'dotenv/config';
import { execSync } from 'child_process';

async function deployContract() {
  console.log('🔨 Deploying RealArbitrageExecutor contract to mainnet...');
  console.log('');

  // Compile contract
  console.log('📦 Compiling contract...');
  const { execSync } = require('child_process');

  try {
    const result = execSync('npx hardhat compile --network mainnet RealArbitrageExecutor.sol', {
      cwd: process.cwd(),
      stdio: 'inherit',
      timeout: 120000
    });

    if (result.stderr) {
      console.error('❌ Compilation failed:', result.stderr);
      return null;
    }

    console.log('✅ Compilation successful');
    console.log('');

    // Deploy contract
    console.log('📦 Deploying contract to mainnet...');
    console.log('Constructor args: paused=false');

    const deployResult = execSync('npx hardhat run scripts/deploy.js --network mainnet --constructor-args \'{"paused":"false"}\'', {
      cwd: process.cwd(),
      stdio: 'inherit',
      timeout: 180000
    });

    if (deployResult.stderr) {
      console.error('❌ Deployment failed:', deployResult.stderr);
      return null;
    }

    console.log('');
    const match = deployResult.stdout.match(/RealArbitrageExecutor deployed to (0x[a-fA-F0-9]+)/);
    if (match && match[1]) {
      const contractAddress = match[1];

      console.log('✅ Contract deployed successfully!');
      console.log('📍 Contract Address:', contractAddress);
      console.log('');

      // Update .env file
      const fs = require('fs');
      const envPath = '.env';
      let envContent = fs.readFileSync(envPath, 'utf8');

      // Update EXECUTOR_ADDRESS
      envContent = envContent.replace(
        /EXECUTOR_ADDRESS=0x[0-9a-f]+/,
        `EXECUTOR_ADDRESS=${contractAddress}`
      );

      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('✅ Updated .env file with new contract address');
      console.log('');

      // Verify deployment
      console.log('🔍 Verifying deployment...');
      console.log('Waiting for contract to be mined...');

      return contractAddress;
    } else {
      console.error('❌ Could not parse deployment output');
      return null;
    }
}

deployContract();