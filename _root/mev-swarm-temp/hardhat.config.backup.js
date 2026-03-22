const { config } = require('dotenv/config');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    goerli: {
      url: config.GOERLI_RPC_URL || "https://goerli.infura.io/v3/YOUR_INFURA_KEY",
      accounts: config.PRIVATE_KEY ? [config.PRIVATE_KEY] : []
    },
    mainnet: {
      url: config.MAINNET_RPC_URL || config.RPC_URL || "https://eth.llamarpc.com",
      accounts: config.PRIVATE_KEY ? [config.PRIVATE_KEY] : []
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  etherscan: {
    apiKey: config.ETHERSCAN_API_KEY || ""
  }
};
