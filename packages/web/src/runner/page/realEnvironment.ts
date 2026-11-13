import type { RunnerEnvironment, XhrOpen } from "../types";
import { evaluateInGlobalScope, runScriptInGlobalScope } from "./evaluate";

/** The runner page's real surroundings, read once when the page starts. */
export function realEnvironment(): RunnerEnvironment {
  return {
    selfOrigin: self.origin,
    isTopLevel: window.top === window || window.parent === window,
    parent: window.parent,
    locationOrigin: location.origin,
    addMessageListener(listener) {
      const onMessage = (event: MessageEvent<unknown>): void => {
        if (event.origin === location.origin) listener(event);
      };
      window.addEventListener("message", onMessage);
      return () => {
        window.removeEventListener("message", onMessage);
      };
    },
    globals: globalThis,
    evaluate: evaluateInGlobalScope,
    runScript: runScriptInGlobalScope,
    network: {
      wrapFetch(wrap) {
        window.fetch = wrap(window.fetch.bind(window));
      },
      wrapXhrOpen(wrap) {
        // Seen through XhrOpen, the native open declares `this: XMLHttpRequest`, so every caller of the captured
        // original must supply the request (rpcRedirect.ts calls it with .call(this)).
        const prototype: { open: XhrOpen } = XMLHttpRequest.prototype;
        prototype.open = wrap(prototype.open);
      },
    },
  };
}
