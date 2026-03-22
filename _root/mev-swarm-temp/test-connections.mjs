import 'dotenv/config';
import BlockchainConnector from './blockchain-connector.js';

async function testConnections() {
  console.log('Testing blockchain connections...\\n');
  
  const connector = new BlockchainConnector();
  const results = await connector.connectAll();
  
  console.log('Connection Results:');
  for (const [network, result] of Object.entries(results)) {
    if (result.error) {
      console.log(✗ : );
    } else {
      console.log(✓ : Block #);
    }
  }
}

testConnections().catch(console.error);
