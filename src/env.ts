/** A setting from .env, or undefined when it is missing or blank. */
function setting(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
}

/** Build-time settings, under the same names as the current app. */
export const env = {
  walletConnectProjectId: setting(import.meta.env.REACT_APP_WALLETCONNECT_PROJECT_ID),
  rpcUrls: {
    1: setting(import.meta.env.REACT_APP_WEB3_FALLBACK_HTTPS_URL),
    100: setting(import.meta.env.REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL),
    11155111: setting(import.meta.env.REACT_APP_WEB3_FALLBACK_SEPOLIA_HTTPS_URL),
    10200: setting(import.meta.env.REACT_APP_WEB3_FALLBACK_CHIADO_HTTPS_URL),
  },
} as const;
