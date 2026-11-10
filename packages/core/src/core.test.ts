import { describe, expect, it } from "vitest";
import {
  APP_NAME,
  COURT_CHAIN_ID_LIST,
  DEFAULT_IPFS_GATEWAY,
  ENV_KEYS,
  REOWN_CONNECT_SRC,
  connectSrc,
  isCourtChainId,
  readEnv,
  renderHeaders,
} from "./index.ts";

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

describe("connect-src", () => {
  const base = {
    REACT_APP_WEB3_FALLBACK_HTTPS_URL: "https://eth.example/v2/SECRET",
    REACT_APP_WEB3_FALLBACK_POLYGON_HTTPS_URL: "https://polygon.example/",
    REACT_APP_SENTRY_ENDPOINT: "https://abc@o1.ingest.sentry.example/42",
  };

  it("lists origins only (no paths or keys), court chains only, sorted", () => {
    const value = connectSrc(readEnv(base));
    expect(value).toBe("'self' https://cdn.kleros.link https://eth.example https://o1.ingest.sentry.example");
    expect(value).not.toContain("SECRET");
    expect(value).not.toContain("polygon");
  });

  it("adds Reown hosts only when a project id is set, never Reown's RPC", () => {
    expect(connectSrc(readEnv(base))).not.toContain("walletconnect");
    const withId = connectSrc(readEnv({ ...base, REACT_APP_WALLETCONNECT_PROJECT_ID: "id" }));
    for (const host of REOWN_CONNECT_SRC) expect(withId).toContain(host);
    expect(withId).not.toContain("rpc.walletconnect");
  });

  it("refuses plain http except for local hosts, without echoing the value", () => {
    expect(() => connectSrc(readEnv({ REACT_APP_ATLAS_URI: "http://atlas.example/SECRET" }))).toThrow(
      /REACT_APP_ATLAS_URI/,
    );
    expect(() => connectSrc(readEnv({ REACT_APP_ATLAS_URI: "http://atlas.example/SECRET" }))).not.toThrow(/SECRET/);
    expect(connectSrc(readEnv({ REACT_APP_ATLAS_URI: "http://127.0.0.1:3000/graphql" }))).toContain(
      "http://127.0.0.1:3000",
    );
    expect(() => connectSrc(readEnv({ REACT_APP_METAEVIDENCE_URL: "not a url" }))).toThrow(
      /REACT_APP_METAEVIDENCE_URL/,
    );
  });

  it("renderHeaders fills the placeholder and refuses leftovers", () => {
    expect(renderHeaders("/\n  Content-Security-Policy: connect-src {{CONNECT_SRC}}\n", readEnv({}))).toContain(
      "connect-src 'self' https://cdn.kleros.link",
    );
    expect(() => renderHeaders("x {{OTHER}}", readEnv({}))).toThrow(/placeholder/);
  });
});
