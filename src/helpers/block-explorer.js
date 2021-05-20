const chainIdToBaseUrl = {
  1: "https://etherscan.io",
  42: "https://kovan.etherscan.io",
  77: "https://blockscout.com/poa/sokol",
};

const getBaseUrl = (chainId) => chainIdToBaseUrl[chainId] ?? chainIdToBaseUrl[1];

export function getAddressUrl(chainId, address) {
  return `${getBaseUrl(chainId)}/address/${address}`;
}

export function getTransactionUrl(chainId, txHash) {
  return `${getBaseUrl(chainId)}/tx/${txHash}`;
}
