import { matchPath } from "react-router-dom";
import { supportedChainIds } from "./networks";

//The chain a URL without any chain information resolves to, when nothing else names one.
const DEFAULT_CHAIN_ID = 1;

//Legacy query alias. Atlas, event-microservices, escrow-ui, dispute-resolver and klerosboard still emit it.
const LEGACY_CHAIN_PARAM = "requiredChainId";

//The first path segment is the chain id. Only supported ids match; anything else falls through to the 404.
export const CHAIN_ID_ROUTE = `/:chainId(${supportedChainIds.join("|")})`;

//Every page of the app, without its chain prefix. app.js builds its routes from these and nothing else.
export const pagePaths = {
  home: "/",
  courts: "/courts",
  cases: "/cases",
  case: "/cases/:ID",
  tokens: "/tokens",
  convertPnk: "/convert-pnk",
};

//Pages that mount no RequiredChainIdGateway. There the connected chain wins over the URL's.
const ungatedPagePaths = [pagePaths.tokens, pagePaths.convertPnk];

//Pages that follow the wallet's chain after it connects. Not the case page: there the same ID is another dispute elsewhere.
const walletFollowingPagePaths = Object.values(pagePaths).filter((path) => path !== pagePaths.case);

//"/cases/:ID" -> "/:chainId(1|100|10200|11155111)/cases/:ID"
export const chainRoutePath = (pagePath) => `${CHAIN_ID_ROUTE}${pagePath}`;

//The only place a chain prefix is concatenated. `path` is chain-relative and starts with "/": ("/", 1) -> "/1/".
export const chainPath = (chainId, path) => `/${chainId}${path}`;

export const toPath = ({ pathname, search = "", hash = "" }) => `${pathname}${search}${hash}`;

//"/100/cases/5" -> { chainId: 100, rest: "/cases/5" }; "/100" -> rest ""; "/100/" -> rest "/".
//Uses the router's own regex, so the parser and the routes cannot disagree about what a prefix is.
export function splitChainPrefix(pathname) {
  const match = matchPath(pathname, { path: CHAIN_ID_ROUTE });
  if (!match) {
    return { chainId: undefined, rest: pathname };
  }
  //match.url swallows a trailing slash ("/100/" gives url "/100/"), so slice by the id's length to keep `rest` byte for byte.
  return { chainId: Number(match.params.chainId), rest: pathname.slice(match.params.chainId.length + 1) };
}

//parseInt keeps the previous reading of reachable values ("100abc" is 100). Only a supported id counts.
function legacyParamChainId(search) {
  const value = Number.parseInt(new URLSearchParams(search).get(LEGACY_CHAIN_PARAM), 10);
  return supportedChainIds.includes(value) ? value : undefined;
}

//The chain a URL asks for: its prefix first, else a valid legacy param (the path wins). Undefined when it names none.
export function urlChainId({ pathname, search }) {
  return splitChainPrefix(pathname).chainId ?? legacyParamChainId(search);
}

function withoutLegacyParam(search) {
  const params = new URLSearchParams(search);
  if (!params.has(LEGACY_CHAIN_PARAM)) {
    return search; //Untouched, byte for byte.
  }
  params.delete(LEGACY_CHAIN_PARAM);
  const rest = params.toString();
  return rest ? `?${rest}` : "";
}

//The prefix rewriter. Total: bare, prefixed, legacy-param and 404 URLs all come out as "/<chainId>/…".
//The legacy param is dropped; the rest of the path, the other params and the hash are kept.
//Neither decodes nor encodes: a router location in, a router location out; window.location in, raw out.
export function withChainPrefix({ pathname, search = "", hash = "" }, chainId) {
  return { pathname: chainPath(chainId, splitChainPrefix(pathname).rest), search: withoutLegacyParam(search), hash };
}

const isPage = (pathname, paths) => paths.some((p) => matchPath(pathname, { path: chainRoutePath(p), exact: true }));

//The location a page must be shown under, or null when the URL is already canonical or is not a page.
export function canonicalLocation(location, connectedChainId) {
  //ChainIdProvider renders the router only once the chain is known, so this is never undefined in the app.
  //Without the check, "/100/tokens" with an unknown chain would be replaced by "/undefined/tokens" (a 404),
  //through the ungated-page branch.
  //chain-navigation.test.js "writes nothing while the chain is unknown" fails if this check is removed.
  if (!connectedChainId) {
    return null;
  }
  const requestedChainId = urlChainId(location) ?? connectedChainId;
  const prefixed = withChainPrefix(location, requestedChainId);
  if (!isPage(prefixed.pathname, Object.values(pagePaths))) {
    return null; //Not a page once prefixed, so the 404 renders in place and the URL stays.
  }
  const target = isPage(prefixed.pathname, ungatedPagePaths) ? withChainPrefix(location, connectedChainId) : prefixed;
  return toPath(target) === toPath(location) ? null : target; //Write only when the URL changes.
}

//The browser's location as the router sees it, for reading the URL's chain outside the router (app start, wallet connect).
//The router decodes the path with decodeURI, so "/%31%30%30/courts" is chain 100 for it. A path that cannot be decoded
//stays raw: the router then fails on it inside the error boundary. Never write this back to the address bar.
export function browserLocation() {
  const { pathname, search, hash } = window.location;
  let decoded = pathname;
  try {
    decoded = decodeURI(pathname);
  } catch {
    //Keep the raw path.
  }
  return { pathname: decoded, search, hash };
}

//Boot-time chain for view-only mode: the URL (prefix, then legacy param), then storage, then mainnet.
//`shouldStore` keeps the previous write rule: store unless storage already holds the URL's chain.
//Pass browserLocation(), so boot reads the chain the router will show.
export function resolveFallbackChainId(location, storedValue) {
  const fromStorage = Number.parseInt(storedValue, 10);
  const fromUrl = urlChainId(location);
  const chainId = fromUrl ?? (Number.isNaN(fromStorage) ? DEFAULT_CHAIN_ID : fromStorage);
  return { chainId, shouldStore: Number.isNaN(fromStorage) || fromStorage !== fromUrl };
}

//The chain to reload onto after a wallet connects, or undefined to reload in place.
//When the wallet stays on another chain than the URL's (switch declined or unsupported), every page but the case page
//follows the wallet, as a URL without a chain always did. The case page keeps its chain and asks to switch instead,
//because the same ID is a different dispute on another chain.
export function chainAfterConnect(location, walletChainId) {
  const followsWallet =
    supportedChainIds.includes(walletChainId) && isPage(location.pathname, walletFollowingPagePaths);
  return followsWallet ? walletChainId : undefined;
}

//Every switch that reloads goes through here: point the address bar at `chainId`, then reload, so the new document boots
//on that chain. replaceState, not the router: nothing re-renders between the rewrite and the reload, and on
//tokens/convert-pnk an in-router write would be canonicalized straight back to the connected chain before the reload.
export function reloadOnChain(chainId) {
  const nextUrl = toPath(withChainPrefix(window.location, chainId));
  if (nextUrl !== toPath(window.location)) {
    window.history.replaceState(window.history.state, "", nextUrl);
  }
  window.location.reload();
}
