import { afterEach, describe, expect, it, vi } from "vitest";

// Every name src/env.ts reads is stubbed with a dummy value, so nothing from a real .env reaches this test.
const names = {
  REACT_APP_WALLETCONNECT_PROJECT_ID: "project",
  REACT_APP_WEB3_FALLBACK_HTTPS_URL: "rpc-1",
  REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL: "rpc-100",
  REACT_APP_WEB3_FALLBACK_SEPOLIA_HTTPS_URL: "rpc-11155111",
  REACT_APP_WEB3_FALLBACK_CHIADO_HTTPS_URL: "rpc-10200",
  REACT_APP_KLEROS_LIQUID_ADDRESS: "kl-1",
  REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_ADDRESS: "ev-1",
  REACT_APP_PINAKION_ADDRESS: "pnk-1",
  REACT_APP_POLICY_REGISTRY_ADDRESS: "pr-1",
  REACT_APP_KLEROS_LIQUID_XDAI_ADDRESS: "kl-100",
  REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_XDAI_ADDRESS: "ev-100",
  REACT_APP_PINAKION_XDAI_ADDRESS: "pnk-100",
  REACT_APP_POLICY_REGISTRY_XDAI_ADDRESS: "pr-100",
  REACT_APP_RAW_PINAKION_XDAI_ADDRESS: "xpnk-100",
  REACT_APP_KLEROS_LIQUID_CHIADO_ADDRESS: "kl-10200",
  REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_CHIADO_ADDRESS: "ev-10200",
  REACT_APP_PINAKION_CHIADO_ADDRESS: "pnk-10200",
  REACT_APP_POLICY_REGISTRY_CHIADO_ADDRESS: "pr-10200",
  REACT_APP_KLEROS_LIQUID_SEPOLIA_ADDRESS: "kl-11155111",
  REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_SEPOLIA_ADDRESS: "ev-11155111",
  REACT_APP_PINAKION_SEPOLIA_ADDRESS: "pnk-11155111",
  REACT_APP_POLICY_REGISTRY_SEPOLIA_ADDRESS: "pr-11155111",
};

async function loadEnv(overrides: Partial<Record<keyof typeof names, string>> = {}) {
  for (const [name, value] of Object.entries({ ...names, ...overrides })) vi.stubEnv(name, value);
  vi.resetModules();
  return import("./env.ts");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("courtConfig", () => {
  it("maps master's env names to each chain's read RPC and contracts", async () => {
    const { courtConfig } = await loadEnv();
    expect(courtConfig.rpcUrls).toEqual({ 1: "rpc-1", 100: "rpc-100", 10200: "rpc-10200", 11155111: "rpc-11155111" });
    expect(courtConfig.contracts).toEqual({
      1: { klerosLiquid: "kl-1", klerosLiquidExtraViews: "ev-1", pinakion: "pnk-1", policyRegistry: "pr-1" },
      100: {
        klerosLiquid: "kl-100",
        klerosLiquidExtraViews: "ev-100",
        pinakion: "pnk-100",
        policyRegistry: "pr-100",
        rawPinakion: "xpnk-100",
      },
      10200: {
        klerosLiquid: "kl-10200",
        klerosLiquidExtraViews: "ev-10200",
        pinakion: "pnk-10200",
        policyRegistry: "pr-10200",
      },
      11155111: {
        klerosLiquid: "kl-11155111",
        klerosLiquidExtraViews: "ev-11155111",
        pinakion: "pnk-11155111",
        policyRegistry: "pr-11155111",
      },
    });
  });

  it("leaves a blank setting out, so the read that needs it fails", async () => {
    const { courtConfig } = await loadEnv({
      REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL: "  ",
      REACT_APP_PINAKION_ADDRESS: "",
    });
    expect(courtConfig.rpcUrls[100]).toBeUndefined();
    expect(courtConfig.contracts[1]?.pinakion).toBeUndefined();
  });
});
