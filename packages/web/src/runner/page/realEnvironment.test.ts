import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadLegacyDuplicateKeyGuard } from "../testing";
import type { RunnerMessageEvent, XhrOpen } from "../types";
import { realEnvironment } from "./realEnvironment";

const nativeOpen = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, "open");
const nativeFetch = Object.getOwnPropertyDescriptor(window, "fetch");
const nativeParse = JSON.parse;

describe("realEnvironment", () => {
  afterEach(() => {
    if (nativeOpen) Object.defineProperty(XMLHttpRequest.prototype, "open", nativeOpen);
    if (nativeFetch) Object.defineProperty(window, "fetch", nativeFetch);
    else Reflect.deleteProperty(window, "fetch");
    JSON.parse = nativeParse;
    Reflect.deleteProperty(globalThis, "__klerosJsonDuplicateKeys");
  });

  it("reads the page's own origin, framing and parent", () => {
    const env = realEnvironment();
    expect(env.selfOrigin).toBe(self.origin);
    expect(env.locationOrigin).toBe(location.origin);
    expect(env.isTopLevel).toBe(true);
    expect(env.parent).toBe(window.parent);
    expect(env.globals).toBe(globalThis);
  });

  // The bootstrap installs the guard and runs the script only through these two; its other tests replace them with a
  // fake or a test realm's own eval, so a broken wiring here would drop the guard on the runner page unnoticed.
  it("evaluate runs the guard in the page's global scope, where the bootstrap reads its duplicate-key flag (P41 keep)", async () => {
    const env = realEnvironment();
    env.evaluate(await loadLegacyDuplicateKeyGuard());
    expect(() => {
      JSON.parse('{"type":"bool","type":"single-select"}');
    }).toThrow("Duplicate keys in JSON document");
    expect(Reflect.get(env.globals, "__klerosJsonDuplicateKeys")).toBe(true);
  });

  it("runScript evaluates the script with its getMetaEvidence() call and returns what that call returned", () => {
    expect(realEnvironment().runScript('const getMetaEvidence = () => "from the entry point";')).toBe(
      "from the entry point",
    );
  });

  it("passes on only messages from the runner URL's own origin, until the listener is removed", () => {
    const seen: RunnerMessageEvent[] = [];
    const remove = realEnvironment().addMessageListener((event) => seen.push(event));
    window.dispatchEvent(new MessageEvent("message", { data: "foreign", origin: "https://attacker.example" }));
    window.dispatchEvent(new MessageEvent("message", { data: "own", origin: location.origin }));
    remove();
    window.dispatchEvent(new MessageEvent("message", { data: "after removal", origin: location.origin }));
    expect(seen.map((event) => event.data)).toEqual(["own"]);
  });

  it("wrapXhrOpen hands the wrapper the native open, called on the request", () => {
    const receivers: unknown[] = [];
    realEnvironment().network.wrapXhrOpen(
      (original: XhrOpen): XhrOpen =>
        function open(this: XMLHttpRequest, method, url, ...rest) {
          receivers.push(this);
          original.call(this, method, url, ...rest);
        },
    );

    const request = new XMLHttpRequest();
    request.open("POST", "https://rpc.example/");

    expect(receivers).toEqual([request]);
    expect(request.readyState).toBe(XMLHttpRequest.OPENED);
  });

  it("wrapFetch replaces the page's fetch with the wrapper around the original", async () => {
    const calls: unknown[] = [];
    window.fetch = (input) => {
      calls.push(input);
      return Promise.resolve(new Response("{}"));
    };
    realEnvironment().network.wrapFetch(
      (original) => (input, init) => original(typeof input === "string" ? `${input}#wrapped` : input, init),
    );
    await window.fetch("https://rpc.example/");
    expect(calls).toEqual(["https://rpc.example/#wrapped"]);
  });

  it("the runner page's sources carry no lint suppression", () => {
    const sources = readdirSync(import.meta.dirname).filter(
      (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"),
    );
    const suppressed = sources.filter((name) =>
      /eslint-disable|@ts-ignore|@ts-expect-error/.test(readFileSync(join(import.meta.dirname, name), "utf8")),
    );
    expect(sources).toContain("realEnvironment.ts");
    expect(suppressed).toEqual([]);
  });
});
