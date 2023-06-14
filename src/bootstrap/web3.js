import { ethers } from "ethers";

const chainIdToRpcEndpoint = {
  1: process.env.REACT_APP_WEB3_FALLBACK_HTTPS_URL,
  5: process.env.REACT_APP_WEB3_FALLBACK_GOERLI_HTTPS_URL,
  100: process.env.REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL,
};

export function getReadOnlyRpcUrl({ chainId }) {
  const url = chainIdToRpcEndpoint[chainId];
  if (!url) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  return url;
}

export function getReadOnlyWeb3({ chainId }) {
  const provider = new ethers.providers.JsonRpcProvider(getReadOnlyRpcUrl({ chainId }));

  return { provider };
}
