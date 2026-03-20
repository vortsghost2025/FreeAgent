import 'dotenv/config';
import BlockchainConnector from './blockchain-connector.js';
const connector = new BlockchainConnector();
connector.connectAll().then(results => {
  console.log('Results:', JSON.stringify(results, null, 2));
});
