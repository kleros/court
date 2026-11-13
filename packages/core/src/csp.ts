import { COURT_CHAIN_ID_LIST } from "./chains.ts";
import { compareCodeUnits } from "./codeUnitOrder.ts";
import { RPC_URL_KEYS, SERVICE_KEYS, SUBGRAPH_URL_KEYS, type CourtEnv } from "./env.ts";

/**
 * Reown AppKit endpoints the app may fetch or open a socket to, read from the built bundle (AppKit 1.8.24). Seen in
 * the court lab with a placeholder project id: api.web3modal.org and pulse.walletconnect.org on page load; the
 * WalletConnect path itself is not lab-testable.
 * rpc.walletconnect.org is deliberately absent: reads never go to Reown's RPC. The wagmi adapter's
 * fallback to it is patched out (.yarn/patches); AppKit's own network objects still list it after ours, so the
 * browser refusing it is the remaining guard there. AppKit also asks it for a connected account's name and avatar
 * (/v1/identity/<address>, on Mainnet and Gnosis): refused here too, one CSP violation per policy and attempt.
 */
export const REOWN_CONNECT_SRC: readonly string[] = [
  "https://api.web3modal.org",
  "https://pulse.walletconnect.org",
  "https://verify.walletconnect.org",
  "wss://relay.walletconnect.org",
];

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname) || hostname.endsWith(".localhost");
}

/** Origin of a configured URL. Values are never echoed in errors: RPC URLs can carry API keys. */
export function originOf(url: string, key: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${key} is not a valid URL`);
  }
  const secure = parsed.protocol === "https:" || parsed.protocol === "wss:";
  const localPlain = (parsed.protocol === "http:" || parsed.protocol === "ws:") && isLocalHost(parsed.hostname);
  if (!secure && !localPlain) throw new Error(`${key} must use https: or wss: (http: only for local hosts)`);
  return `${parsed.protocol}//${parsed.host}`;
}

/** connect-src for the app: 'self', every configured service the app itself calls, Sentry, and Reown. */
export function connectSrc(env: CourtEnv): string {
  const sources: [string, string | undefined][] = [
    ...COURT_CHAIN_ID_LIST.map((id): [string, string | undefined] => [RPC_URL_KEYS[id], env.rpcUrls[id]]),
    ...COURT_CHAIN_ID_LIST.map((id): [string, string | undefined] => [SUBGRAPH_URL_KEYS[id], env.subgraphUrls[id]]),
    [SERVICE_KEYS.metaEvidenceUrl, env.metaEvidenceUrl],
    [SERVICE_KEYS.justificationsUrl, env.justificationsUrl],
    [SERVICE_KEYS.atlasUri, env.atlasUri],
    [SERVICE_KEYS.ipfsGateway, env.ipfsGateway],
    [SERVICE_KEYS.sentryDsn, env.sentryDsn],
  ];
  const origins = new Set<string>();
  for (const [key, url] of sources) if (url !== undefined) origins.add(originOf(url, key));
  if (env.walletConnectProjectId !== undefined) for (const origin of REOWN_CONNECT_SRC) origins.add(origin);
  return ["'self'", ...[...origins].sort(compareCodeUnits)].join(" ");
}

/**
 * The app's Content-Security-Policy, the one source for both copies: the _headers rules of the app paths and the
 * <meta> in index.html (D-03): scripts only from the app itself, never inline; connections only to the configured
 * hosts; never framed (frame-ancestors 'none'); no third-party stylesheet, with 'unsafe-inline' styles only because
 * Reown AppKit needs them.
 */
function appDirectives(env: CourtEnv): readonly (readonly [string, string])[] {
  return [
    ["default-src", "'self'"],
    ["script-src", "'self'"],
    ["style-src", "'self' 'unsafe-inline'"],
    ["img-src", "'self' data: blob: https:"],
    ["font-src", "'self'"],
    ["frame-src", "'self' https:"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    // Last before frame-ancestors, so in the <meta> (which drops frame-ancestors) the origin list ends at the closing
    // quote: the court lab's bundle scan (court-lab lib/build/scan.mjs URL_RE) reads a ";" right after an origin as part
    // of its host and fails the build on that unknown "origin".
    ["connect-src", connectSrc(env)],
    ["frame-ancestors", "'none'"],
  ];
}

const join = (directives: readonly (readonly [string, string])[]): string =>
  directives.map(([name, value]) => `${name} ${value}`).join("; ");

/** The policy the app paths get as a response header. */
export function appPolicy(env: CourtEnv): string {
  return join(appDirectives(env));
}

/**
 * The policy index.html carries as a <meta>, so every path the SPA fallback answers has it, including deep paths no
 * _headers rule lists. Without frame-ancestors, which browsers ignore in a <meta>: framing stays with the header rules
 * and src/framing.ts (the court is never framed).
 */
export function metaPolicy(env: CourtEnv): string {
  return join(appDirectives(env).filter(([name]) => name !== "frame-ancestors"));
}

const APP_CSP_PLACEHOLDER = "{{APP_CSP}}";

/** Fills the _headers template. Fails when a placeholder is left, so a broken template never ships. */
export function renderHeaders(template: string, env: CourtEnv): string {
  const rendered = template.split(APP_CSP_PLACEHOLDER).join(appPolicy(env));
  if (rendered.includes("{{")) throw new Error("_headers: unfilled placeholder");
  return rendered;
}

const CHARSET_META = '<meta charset="utf-8" />';

/**
 * index.html with the meta policy as the first element after <meta charset>: before every element that loads anything,
 * while the charset declaration stays within the first 1024 bytes as HTML requires (the policy grows with connect-src).
 */
export function renderIndexHtml(html: string, env: CourtEnv): string {
  if (html.split(CHARSET_META).length !== 2) throw new Error(`index.html: expected exactly one ${CHARSET_META}`);
  const content = metaPolicy(env).replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  const meta = `<meta http-equiv="Content-Security-Policy" content="${content}" />`;
  return html.replace(CHARSET_META, () => `${CHARSET_META}\n    ${meta}`);
}
