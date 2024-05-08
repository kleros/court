import logoXPNK from "../../assets/images/xPNK.png";
import logoStPNK from "../../assets/images/stPNK.png";
import mainnet from "../../assets/deployments/mainnet.json";
import gnosis from "../../assets/deployments/gnosis.json";
import { getBaseUrl } from "../../helpers/block-explorer";
import { GNOSIS, getFallbackHttpsUrl } from "../../helpers/networks";

export const Tokens = {
  PNK: "PNK",
  stPNK: "stPNK",
};

const supportedSideChains = {
  // xDai
  [GNOSIS]: {
    chainId: GNOSIS,
    chainName: "Gnosis Chain",
    nativeCurrency: { name: "xDAI", symbol: "xDAI", decimals: 18 },
    rpcUrls: getFallbackHttpsUrl(GNOSIS),
    blockExplorerUrls: [getBaseUrl(100)],
    bridgeAppUrl: `https://omni.gnosischain.com/bridge?from=1&to=100&token=${mainnet.pinakionAddress}`,
    bridgeAppHistoryUrl: "https://omni.gnosischain.com/history",
    mainChainId: 1,
    tokens: {
      [Tokens.PNK]: {
        address: gnosis.rawPinakionAddress,
        symbol: "PNK",
        decimals: 18,
        image: `${window.location.origin}${logoXPNK}`,
      },
      [Tokens.stPNK]: {
        address: gnosis.pinakionAddress,
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
