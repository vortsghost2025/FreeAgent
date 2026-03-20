import { callEtherscan } from "./client.js";

export async function getTokenHolderCount(contract) {
  return await callEtherscan({
    module: "token",
    action: "tokenholdercount",
    contractaddress: contract
  });
}

export async function getTopTokenHolders(contract) {
  return await callEtherscan({
    module: "token",
    action: "toptokenholders",
    contractaddress: contract
  });
}

export async function getTokenSupplyHistory(contract, blockNo) {
  return await callEtherscan({
    module: "stats",
    action: "tokensupplyhistory",
    contractaddress: contract,
    blockno: blockNo
  });
}