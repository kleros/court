const chainIdToBaseUrl = {
  1: "https://etherscan.io",
  5: "https://goerli.etherscan.io",
  100: "https://blockscout.com/poa/xdai",
  10200: "https://blockscout.chiadochain.net",
};

export const getBaseUrl = (chainId) => chainIdToBaseUrl[chainId] ?? chainIdToBaseUrl[1];

export const getAddressUrl = (chainId, address) => `${getBaseUrl(chainId)}/address/${address}`;

export const getTransactionUrl = (chainId, txHash) => `${getBaseUrl(chainId)}/tx/${txHash}`;
