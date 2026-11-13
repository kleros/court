import { describe, expect, it } from "vitest";
import {
  REOWN_CONNECT_SRC,
  appPolicy,
  connectSrc,
  metaPolicy,
  readEnv,
  renderHeaders,
  renderIndexHtml,
} from "./index.ts";

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
    expect(renderHeaders("/\n  Content-Security-Policy: {{APP_CSP}}\n", readEnv({}))).toBe(
      `/\n  Content-Security-Policy: ${appPolicy(readEnv({}))}\n`,
    );
    expect(() => renderHeaders("x {{OTHER}}", readEnv({}))).toThrow(/placeholder/);
  });
});

describe("app policy", () => {
  const env = readEnv({ REACT_APP_WALLETCONNECT_PROJECT_ID: "id" });

  it("header policy: no inline script, configured hosts only, never framed", () => {
    expect(appPolicy(env)).toBe(
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; " +
        "font-src 'self'; frame-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'; " +
        `connect-src ${connectSrc(env)}; frame-ancestors 'none'`,
    );
  });

  it("meta policy = header policy minus frame-ancestors (a <meta> cannot carry it), ending with connect-src", () => {
    expect(metaPolicy(env)).toBe(appPolicy(env).replace("; frame-ancestors 'none'", ""));
    expect(metaPolicy(env).endsWith(`connect-src ${connectSrc(env)}`)).toBe(true);
  });

  it("renderIndexHtml puts the meta policy right after <meta charset>, attribute-escaped", () => {
    const html = '<head>\n    <meta charset="utf-8" />\n    <title>x</title>\n</head>';
    expect(renderIndexHtml(html, env)).toBe(
      '<head>\n    <meta charset="utf-8" />\n' +
        `    <meta http-equiv="Content-Security-Policy" content="${metaPolicy(env)}" />\n` +
        "    <title>x</title>\n</head>",
    );
    // URL parsing lets " and & (and $&) through in a host; the attribute must still hold the whole value.
    const odd = readEnv({ REACT_APP_ATLAS_URI: 'https://a"b$&c.example/graphql' });
    expect(renderIndexHtml(html, odd)).toContain(" https://a&quot;b$&amp;c.example ");
    expect(() => renderIndexHtml("<head></head>", env)).toThrow(/meta charset/);
  });
});
