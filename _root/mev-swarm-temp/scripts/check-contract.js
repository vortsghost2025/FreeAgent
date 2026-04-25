# REMOVED: sensitive data redacted by automated security cleanup
import hre from 'hardhat';

async function main() {
  const { ethers } = hre;
  
  // Try to check the contract at the existing address
  const contractAddress = 'REDACTED_ADDRESS';
  
  try {
    // Get contract code
    const code = await ethers.provider.getCode(contractAddress);
    console.log('Contract code length:', code.length);
    
    if (code === '0x') {
      console.log('⚠️ No contract at this address');
    } else {
      console.log('✅ Contract exists at this address');
      
      // Try to call owner() - works if it's RealArbitrageExecutor
      try {
        const abi = ['function owner() view returns (address)'];
        const contract = new ethers.Contract(contractAddress, abi, ethers.provider);
        const owner = await contract.owner();
        console.log('Contract owner:', owner);
      } catch (e) {
        console.log('Could not get owner - may be placeholder contract');
      }
    }
  } catch (e) {
    console.log('Error checking contract:', e.message);
  }
}

main();
