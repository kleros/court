import { COURT_CHAIN_ID_LIST } from "./chains.ts";
import { RPC_URL_KEYS, SERVICE_KEYS, SUBGRAPH_URL_KEYS, type CourtEnv } from "./env.ts";

/**
 * Reown AppKit endpoints the app may fetch or open a socket to, read from the built bundle (AppKit 1.8.24).
 * Runtime behaviour in a browser is unverified until a project id is set (WalletConnect is not lab-testable).
 * rpc.walletconnect.org is deliberately absent: reads never go to Reown's RPC (03 DEC-REOWN). The wagmi adapter's
 * fallback to it is patched out (.yarn/patches); AppKit's own network objects still list it after ours, so the
 * browser refusing it is the remaining guard there.
 */
export const REOWN_CONNECT_SRC: readonly string[] = [
  "https://api.web3modal.org",
  "https://pulse.walletconnect.org",
  "https://verify.walletconnect.org",
  "wss://relay.walletconnect.org",
];

export const CONNECT_SRC_PLACEHOLDER = "{{CONNECT_SRC}}";

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
  return ["'self'", ...[...origins].sort()].join(" ");
}

/** Fills the _headers template. Fails when a placeholder is left, so a broken template never ships. */
export function renderHeaders(template: string, env: CourtEnv): string {
  const rendered = template.split(CONNECT_SRC_PLACEHOLDER).join(connectSrc(env));
  if (rendered.includes("{{")) throw new Error("_headers: unfilled placeholder");
  return rendered;
}
