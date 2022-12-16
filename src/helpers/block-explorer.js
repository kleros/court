const chainIdToBaseUrl = {
  1: "https://etherscan.io",
  3: "https://ropsten.etherscan.io",
  4: "https://rinkeby.etherscan.io",
  42: "https://kovan.etherscan.io",
  77: "https://blockscout.com/poa/sokol",
  100: "https://blockscout.com/poa/xdai",
  10200: "https://blockscout.chiadochain.net",
};

export const getBaseUrl = (chainId) => chainIdToBaseUrl[chainId] ?? chainIdToBaseUrl[1];

export const getAddressUrl = (chainId, address) => `${getBaseUrl(chainId)}/address/${address}`;

export const getTransactionUrl = (chainId, txHash) => `${getBaseUrl(chainId)}/tx/${txHash}`;
