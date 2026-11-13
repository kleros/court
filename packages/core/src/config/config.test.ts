import { describe, expect, it } from "vitest";
import { APP_NAME, COURT_CHAIN_ID_LIST, DEFAULT_IPFS_GATEWAY, ENV_KEYS, isCourtChainId, readEnv } from "../index.ts";
import { isRetryable, type Outcome } from "../kernel/index.ts";
import { contractAddress, pickPublicEnv } from "./index.ts";

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

describe("pickPublicEnv", () => {
  it("keeps only the variables the app reads, so a secret given the public prefix never reaches the bundle", () => {
    expect(pickPublicEnv({ REACT_APP_SECRET_X: "planted", REACT_APP_CONTEXT: "production", PATH: "/usr/bin" })).toEqual(
      { REACT_APP_CONTEXT: "production" },
    );
  });

  it("loses nothing the app reads", () => {
    const every = Object.fromEntries(ENV_KEYS.map((key, i) => [key, `value-${String(i)}`]));
    expect(pickPublicEnv({ ...every, REACT_APP_SECRET_X: "planted" })).toEqual(every);
    expect(readEnv(pickPublicEnv(every))).toEqual(readEnv(every));
  });

  it("keeps string values only", () => {
    expect(
      pickPublicEnv({ REACT_APP_CONTEXT: 1, REACT_APP_ATLAS_URI: true, REACT_APP_SENTRY_ENDPOINT: undefined }),
    ).toEqual({});
  });

  it("passes blank values on as given: only readEnv decides that blank means unset", () => {
    expect(pickPublicEnv({ REACT_APP_CONTEXT: "", REACT_APP_ATLAS_URI: "  " })).toEqual({
      REACT_APP_CONTEXT: "",
      REACT_APP_ATLAS_URI: "  ",
    });
  });
});

describe("contractAddress", () => {
  const MAINNET_LIQUID = "0x988B3A538b618C7A603e1c11Ab82Cd16dbE28069";
  const GNOSIS_LIQUID = "0x9C1dA9A04925bDfDedf0f6421bC7EEa8305F9002";
  const env = readEnv({
    REACT_APP_KLEROS_LIQUID_ADDRESS: MAINNET_LIQUID,
    REACT_APP_KLEROS_LIQUID_XDAI_ADDRESS: ` ${GNOSIS_LIQUID} `,
    REACT_APP_PINAKION_ADDRESS: "0x93ed3fbe21207ec2e8f2d3c3de6e058cb73bc04d-oops",
    REACT_APP_KLEROS_LIQUID_BLOCK_NUMBER: "7303699",
  });

  function notConfigured(outcome: Outcome<unknown>): string {
    if (outcome.ok) throw new Error("expected a failure");
    expect(outcome.failure).toMatchObject({ kind: "unavailable", reason: "not-configured" });
    expect(isRetryable(outcome.failure)).toBe(false);
    return outcome.failure.message;
  }

  it("gives the chain's configured address, lowercase", () => {
    expect(contractAddress(env, 1, "klerosLiquid")).toEqual({ ok: true, value: MAINNET_LIQUID.toLowerCase() });
    expect(contractAddress(env, 100, "klerosLiquid")).toEqual({ ok: true, value: GNOSIS_LIQUID.toLowerCase() });
  });

  it("an unset variable is not configured, never another chain's address", () => {
    expect(notConfigured(contractAddress(env, 11155111, "klerosLiquid"))).toContain(
      "REACT_APP_KLEROS_LIQUID_SEPOLIA_ADDRESS",
    );
    expect(notConfigured(contractAddress(env, 100, "pinakion"))).toContain("REACT_APP_PINAKION_XDAI_ADDRESS");
  });

  it("a value that is not an address is not configured either, and the value is never echoed", () => {
    const message = notConfigured(contractAddress(env, 1, "pinakion"));
    expect(message).toContain("REACT_APP_PINAKION_ADDRESS");
    expect(message).not.toContain("oops");
  });

  it("a contract the chain does not have is not configured", () => {
    notConfigured(contractAddress(env, 1, "tokenBridge"));
    notConfigured(contractAddress(env, 11155111, "uniswapV2Factory"));
  });

  it("the deploy block is not a contract name", () => {
    // @ts-expect-error klerosLiquidBlockNumber holds a block number, not an address
    notConfigured(contractAddress(env, 1, "klerosLiquidBlockNumber"));
  });
});
