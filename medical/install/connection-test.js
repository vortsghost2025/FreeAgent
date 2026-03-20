require('dotenv').config({path: '../.env'});
const { default: BlockchainConnector } = require('./blockchain-connector.js');
const connector = new BlockchainConnector();
connector.connectAll().then(results => {
  console.log('Connection Results:');
  for (const [network, result] of Object.entries(results)) {
    if (result.error) {
      console.log(network + ': ERROR - ' + result.error);
    } else {
      console.log(network + ': SUCCESS - Block #' + result.blockNumber);
    }
  }
});
