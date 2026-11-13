import type { RpcRedirect } from "@court/core";
import type { FetchFunction, NetworkHooks, XhrOpen } from "../types";

/**
 * P43 keep: today's frame sends requests for one exact old RPC URL to the arbitrable chain's read RPC instead
 * (02.3.4). Only a request to exactly a redirect's `fromUrl` is rewritten; `undefined` leaves the request alone.
 */
export function redirectTarget(redirects: readonly RpcRedirect[], url: string): string | undefined {
  return redirects.find((redirect) => redirect.fromUrl === url)?.toUrl;
}

/** The same request to another URL; the body is read first, since a stream body cannot be handed on as is. */
async function redirectedRequest(target: string, request: Request): Promise<Request> {
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
  return new Request(target, {
    method: request.method,
    headers: request.headers,
    body,
    credentials: request.credentials,
    cache: request.cache,
    redirect: request.redirect,
    integrity: request.integrity,
    keepalive: request.keepalive,
    referrerPolicy: request.referrerPolicy,
    signal: request.signal,
  });
}

export function installRpcRedirect(network: NetworkHooks, redirects: readonly RpcRedirect[]): void {
  if (redirects.length === 0) return;

  network.wrapFetch((original: FetchFunction): FetchFunction => (input, init) => {
    const target = redirectTarget(redirects, input instanceof Request ? input.url : String(input));
    if (target === undefined) return original(input, init);
    if (input instanceof Request) return redirectedRequest(target, input).then((request) => original(request, init));
    return original(target, init);
  });

  network.wrapXhrOpen(
    (original: XhrOpen): XhrOpen =>
      function open(this: XMLHttpRequest, method, url, ...rest) {
        original.call(this, method, redirectTarget(redirects, String(url)) ?? url, ...rest);
      },
  );
}
