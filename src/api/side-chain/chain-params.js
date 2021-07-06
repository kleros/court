import { getBaseUrl } from "../../helpers/block-explorer";

const supportedSideChains = {
  // xDai
  100: {
    chainId: 100,
    chainName: "xDAI",
    nativeCurrency: { name: "xDAI", symbol: "xDAI", decimals: 18 },
    rpcUrls: [ensureEnv("REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL")],
    blockExplorerUrls: [getBaseUrl(100)],
    bridgeAppUrl: `https://omni.xdaichain.com/bridge?from=100&to=1&token=${ensureEnv("REACT_APP_PINAKION_ADDRESS")}`,
    mainChainId: 1,
  },
  // Sokol
  77: {
    chainId: 77,
    chainName: "Sokol",
    nativeCurrency: { name: "Sokol POA", symbol: "SPOA", decimals: 18 },
    rpcUrls: [ensureEnv("REACT_APP_WEB3_FALLBACK_SOKOL_HTTPS_URL")],
    blockExplorerUrls: [getBaseUrl(77)],
    bridgeAppUrl: `https://sokol-omnibridge.web.app/bridge?from=42&to=77&token=${ensureEnv(
      "REACT_APP_PINAKION_KOVAN_ADDRESS"
    )}`,
    mainChainId: 42,
  },
};

export function getSideChainId(chainId) {
  return getSideChainParamsFromMainChainId(chainId).chainId;
}

export function getSideChainParams(sideChainId) {
  const params = supportedSideChains[sideChainId];
  if (!params) {
    throw new Error(`Unsupported side-chain ID: ${sideChainId}`);
  }
  return params;
}

export function isSupportedSideChain(chainId) {
  return supportedSideChains[chainId] !== undefined;
}

export function getSideChainParamsFromMainChainId(mainChainId) {
  const params = mainChainIdToSideChainParams[mainChainId];
  if (!params) {
    throw new Error(`Unsupported chain ID: ${mainChainId}`);
  }
  return params;
}

export function getMainChainId(chainId) {
  return getSideChainParams(chainId).mainChainId;
}

export function isSupportedMainChain(chainId) {
  return mainChainIdToSideChainParams[chainId] !== undefined;
}

export function isSupportedChain(chainId) {
  return isSupportedSideChain(chainId) || isSupportedMainChain(chainId);
}

export function getCounterPartyChainId(chainId) {
  if (isSupportedMainChain(chainId)) {
    return getSideChainId(chainId);
  }

  if (isSupportedSideChain(chainId)) {
    return getMainChainId(chainId);
  }

  throw new Error(`Unsupported chain ID: ${chainId}`);
}

const mainChainIdToSideChainParams = Object.values(supportedSideChains).reduce(
  (acc, chainParams) => Object.assign(acc, { [chainParams.mainChainId]: chainParams }),
  {}
);

function ensureEnv(key, msg = `process.env.${key} is not defined`) {
  const value = process.env[key];

  if (value === "" || value === undefined || value === null) {
    throw new Error(msg);
  }

  return value;
}
