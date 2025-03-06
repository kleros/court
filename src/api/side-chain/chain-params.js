import logoXPNK from "../../assets/images/xPNK.png";
import logoStPNK from "../../assets/images/stPNK.png";

import { getBaseUrl } from "../../helpers/block-explorer";

export const Tokens = {
  PNK: "PNK",
  stPNK: "stPNK",
};

const supportedSideChains = {
  // xDai
  100: {
    chainId: 100,
    chainName: "Gnosis Chain",
    nativeCurrency: { name: "xDAI", symbol: "xDAI", decimals: 18 },
    rpcUrls: [ensureEnv("REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL")],
    blockExplorerUrls: [getBaseUrl(100)],
    bridgeAppUrl: `https://omni.gnosischain.com/bridge?from=1&to=100&token=${ensureEnv("REACT_APP_PINAKION_ADDRESS")}`,
    bridgeAppHistoryUrl: "https://omni.gnosischain.com/history",
    mainChainId: 1,
    tokens: {
      [Tokens.PNK]: {
        address: ensureEnv("REACT_APP_RAW_PINAKION_XDAI_ADDRESS"),
        symbol: "PNK",
        decimals: 18,
        image: `${window.location.origin}${logoXPNK}`,
      },
      [Tokens.stPNK]: {
        address: ensureEnv("REACT_APP_PINAKION_XDAI_ADDRESS"),
        symbol: "stPNK",
        decimals: 18,
        image: `${window.location.origin}${logoStPNK}`,
      },
    },
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
