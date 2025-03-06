const chainIdToBaseUrl = {
  1: "https://etherscan.io",
  100: "https://gnosisscan.io",
  10200: "https://blockscout.chiadochain.net",
  11155111: "https://sepolia.etherscan.io",
};

export const getBaseUrl = (chainId) => chainIdToBaseUrl[chainId] ?? chainIdToBaseUrl[1];

export const getAddressUrl = (chainId, address) => `${getBaseUrl(chainId)}/address/${address}`;

export const getTransactionUrl = (chainId, txHash) => `${getBaseUrl(chainId)}/tx/${txHash}`;
