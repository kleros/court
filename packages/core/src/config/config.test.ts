import { describe, expect, it } from "vitest";
import { APP_NAME, COURT_CHAIN_ID_LIST, DEFAULT_IPFS_GATEWAY, ENV_KEYS, isCourtChainId, readEnv } from "../index.ts";

describe("smoke", () => {
  it("names the app and its four chains", () => {
    expect(APP_NAME).toBe("Kleros Court");
    expect([...COURT_CHAIN_ID_LIST].sort((a, b) => a - b)).toEqual([1, 100, 10200, 11155111]);
    expect(isCourtChainId(100)).toBe(true);
    expect(isCourtChainId(137)).toBe(false);
    expect(isCourtChainId("1")).toBe(false);
  });
});

describe("readEnv", () => {
  it("builds with nothing set: read-only, Sentry off, today's gateway", () => {
    const env = readEnv({});
    expect(env.walletConnectProjectId).toBeUndefined();
    expect(env.sentryDsn).toBeUndefined();
    expect(env.ipfsGateway).toBe(DEFAULT_IPFS_GATEWAY);
    expect(env.rpcUrls).toEqual({});
  });

  it("treats blank values as unset and trims", () => {
    const env = readEnv({
      REACT_APP_WALLETCONNECT_PROJECT_ID: "  ",
      REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL: " https://g.example/x ",
    });
    expect(env.walletConnectProjectId).toBeUndefined();
    expect(env.rpcUrls[100]).toBe("https://g.example/x");
  });

  it("has no duplicate keys, all REACT_APP_*", () => {
    expect(new Set(ENV_KEYS).size).toBe(ENV_KEYS.length);
    for (const key of ENV_KEYS) expect(key).toMatch(/^REACT_APP_[A-Z0-9_]+$/);
  });
});
