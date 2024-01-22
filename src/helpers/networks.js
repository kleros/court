export const MAINNET = 1;
export const GOERLI = 5;
export const GNOSIS = 100;
export const CHIADO = 10200;
export const SEPOLIA = 11155111;
export const POLYGON = 137;
export const MUMBAI = 80001;

export const chainIdToNetworkName = {
  [MAINNET]: "Ethereum Mainnet",
  [GOERLI]: "Ethereum Testnet Görli",
  [GNOSIS]: "Gnosis Chain",
  [CHIADO]: "Gnosis Testnet Chiado",
  [SEPOLIA]: "Ethereum Testnet Sepolia",
};

export const chainIdToNetworkShortName = {
  [MAINNET]: "Mainnet",
  [GOERLI]: "Görli",
  [GNOSIS]: "Gnosis Chain",
  [CHIADO]: "Chiado",
  [SEPOLIA]: "Sepolia",
};

const fallbackHttpsUrl = {
  [MAINNET]: process.env.REACT_APP_WEB3_FALLBACK_MAINNET_HTTPS_URL,
  [GOERLI]: process.env.REACT_APP_WEB3_FALLBACK_GOERLI_HTTPS_URL,
  [GNOSIS]: process.env.REACT_APP_WEB3_FALLBACK_GNOSIS_HTTPS_URL,
  [POLYGON]: process.env.REACT_APP_WEB3_FALLBACK_POLYGON_HTTPS_URL,
  [CHIADO]: process.env.REACT_APP_WEB3_FALLBACK_CHIADO_HTTPS_URL,
  [MUMBAI]: process.env.REACT_APP_WEB3_FALLBACK_MUMBAI_HTTPS_URL,
  [SEPOLIA]: process.env.REACT_APP_WEB3_FALLBACK_SEPOLIA_HTTPS_URL,
};

const fallbackUrl = {
  [MAINNET]: process.env.REACT_APP_WEB3_FALLBACK_MAINNET_URL,
  [GOERLI]: process.env.REACT_APP_WEB3_FALLBACK_GOERLI_URL,
  [GNOSIS]: process.env.REACT_APP_WEB3_FALLBACK_GNOSIS_URL,
  [CHIADO]: process.env.REACT_APP_WEB3_FALLBACK_CHIADO_URL,
  [SEPOLIA]: process.env.REACT_APP_WEB3_FALLBACK_SEPOLIA_URL,
};

export const getFallbackHttpsUrl = (chainId) => fallbackHttpsUrl[chainId];
export const getFallbackUrl = (chainId) => fallbackUrl[chainId];
export const getUrl = (chainId) => fallbackHttpsUrl[chainId] ?? fallbackUrl[chainId];
