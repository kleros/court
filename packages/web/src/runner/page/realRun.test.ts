import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  ACCEPTED,
  SAMPLE_PARAMS,
  START,
  createRealmRunnerEnvironment,
  loadLegacyDuplicateKeyGuard,
  runRequest,
  settleMacrotasks,
} from "../testing";
import type { RunnerRequestMessage } from "../types";
import { bootstrapRunner } from "./bootstrap";

// The bootstrap with real evaluation: guard and script run as code in a fresh frame realm, as on the runner page.

let guardSource = "";
const realms: (() => void)[] = [];

beforeAll(async () => {
  guardSource = await loadLegacyDuplicateKeyGuard();
});

afterEach(() => {
  for (const dispose of realms.splice(0)) dispose();
});

async function run(request: RunnerRequestMessage) {
  const fake = createRealmRunnerEnvironment();
  realms.push(() => {
    fake.dispose();
  });
  bootstrapRunner(fake.env);
  fake.deliver(fake.fromParent(request));
  await settleMacrotasks();
  return fake.replies;
}

describe("a real run with the duplicate-key guard (02.3.5, P41 keep)", () => {
  it("a script parsing JSON without duplicate keys resolves with the flag off", async () => {
    const scriptText = `var getMetaEvidence = async function () {
      await Promise.resolve();
      var template = JSON.parse('{"title":"Will it rain?","type":"bool"}');
      resolveScript({ question: template.title });
    };`;
    expect(await run(runRequest({ scriptText, guardSource }))).toEqual([
      ACCEPTED,
      { type: "court-runner/result", value: { question: "Will it rain?" }, jsonDuplicateKeys: false },
    ]);
  });

  it("an async script whose template has a duplicate key after an await fails at once, carrying the flag", async () => {
    // Shaped like the pinned Reality bundles: an async entry point that parses the template after its chain reads.
    const scriptText = `var getMetaEvidence = async function () {
      await Promise.resolve();
      var template = JSON.parse('{"title":"x","type":"bool","type":"single-select"}');
      return resolveScript({ rulingOptions: { type: template.type } });
    };`;
    expect(await run(runRequest({ scriptText, guardSource }))).toEqual([
      ACCEPTED,
      { type: "court-runner/error", message: "Duplicate keys in JSON document", jsonDuplicateKeys: true },
    ]);
  });

  it("a script that catches the guard's throw and still resolves reports its value with the flag on", async () => {
    const scriptText = `var getMetaEvidence = function () {
      try { JSON.parse('{"a":1,"a":2}'); } catch (error) {}
      resolveScript({ title: "resolved anyway" });
    };`;
    expect(await run(runRequest({ scriptText, guardSource }))).toEqual([
      ACCEPTED,
      { type: "court-runner/result", value: { title: "resolved anyway" }, jsonDuplicateKeys: true },
    ]);
  });

  it("without a guard, JSON.parse keeps its native behaviour", async () => {
    const scriptText = `var getMetaEvidence = function () {
      resolveScript(JSON.parse('{"a":1,"a":2}'));
    };`;
    expect(await run(runRequest({ scriptText, guardSource: null }))).toEqual([
      ACCEPTED,
      { type: "court-runner/result", value: { a: 2 }, jsonDuplicateKeys: false },
    ]);
  });
});

describe("a real run of today's script forms", () => {
  it("a const getMetaEvidence that reads scriptParameters at call time", async () => {
    const scriptText = `const getMetaEvidence = () => {
  resolveScript({ arbitrableInterfaceURI: \`https://example.org/interact/\${scriptParameters.disputeID}\` });
};
`;
    expect(await run(runRequest({ scriptText }))).toEqual([
      ACCEPTED,
      {
        type: "court-runner/result",
        value: { arbitrableInterfaceURI: "https://example.org/interact/1650" },
        jsonDuplicateKeys: false,
      },
    ]);
  });

  it("a non-ASCII literal in the script text reaches the script and the result unchanged", async () => {
    // The unit half: the page's own UTF-8 decoding is checked in the browser (e2e/runner).
    const scriptText = 'var getMetaEvidence = function () { resolveScript({ parts: "Harris␟Trump".split("␟") }); };';
    expect(await run(runRequest({ scriptText }))).toEqual([
      ACCEPTED,
      { type: "court-runner/result", value: { parts: ["Harris", "Trump"] }, jsonDuplicateKeys: false },
    ]);
  });

  it("a testnet run hands back asker-chosen output as data, untouched (stand-in for a testnet Reality bundle)", async () => {
    // Not a real bundle: a short script on the bundles' output path (question = the template's title), with the
    // title an object, as an asker's custom template can make it. The runner only carries the value; checking it is
    // the case file's job, and the frame is opaque on every chain (host tests).
    const sepolia = { ...SAMPLE_PARAMS, arbitratorChainID: 11155111, arbitrableChainID: 11155111 };
    const scriptText = `var getMetaEvidence = async function () {
      var populated = JSON.parse('{"title":{"not":"a string"},"type":"bool"}');
      return resolveScript({ question: populated.title, chain: scriptParameters.arbitrableChainID });
    };`;
    expect(await run(runRequest({ scriptText, guardSource, params: sepolia }))).toEqual([
      ACCEPTED,
      {
        type: "court-runner/result",
        value: { question: { not: "a string" }, chain: 11155111 },
        jsonDuplicateKeys: false,
      },
    ]);
  });
});

describe("a real run over a real port", () => {
  // The fake port hands the host's message straight to the page; a real MessagePort delivers only once the page has
  // started listening on it, so a page that missed the start signal would never run (the browser half: e2e/runner).
  it("waits for the host's start signal on the transferred port, then replies on that port", async () => {
    const fake = createRealmRunnerEnvironment();
    realms.push(() => {
      fake.dispose();
    });
    const channel = new MessageChannel();
    const received: unknown[] = [];
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      received.push(event.data);
    };
    realms.push(() => {
      channel.port1.close();
    });
    bootstrapRunner(fake.env);
    const scriptText = "var getMetaEvidence = function () { resolveScript({ started: true }); };";
    fake.deliver({ ...fake.fromParent(runRequest({ scriptText })), ports: [channel.port2] });
    await settleMacrotasks();
    expect(received).toEqual([ACCEPTED]);
    channel.port1.postMessage(START);
    await settleMacrotasks();
    expect(received).toEqual([
      ACCEPTED,
      { type: "court-runner/result", value: { started: true }, jsonDuplicateKeys: false },
    ]);
  });
});
