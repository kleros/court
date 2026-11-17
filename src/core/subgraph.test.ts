// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CourtConfig } from "./config.ts";
import { readDraws, readEvidenceList, readShifts } from "./subgraph.ts";

// The answers are written in the display subgraph's GraphQL answer shape, with ids built as its mappings build them
// (Draw `<disputeID>-<appeal>-<voteID>`, TokenAndETHShift `<disputeID>-<address>-<n>`; lab worktree
// services/subgraph/upstream/mappings/kleros-liquid.ts). A live subgraph is the lab stage's oracle, not this file's.

const config: CourtConfig = {
  rpcUrls: {},
  contracts: {},
  displaySubgraphUrls: { 1: "http://subgraph.invalid/1", 100: "http://subgraph.invalid/100" },
};
const juror = "0xAbCdEf0123456789aBcDeF0123456789AbCdEf01";
const zero = "0x0000000000000000000000000000000000000000";

interface Sent {
  readonly url: string;
  readonly method: string | undefined;
  readonly headers: HeadersInit | undefined;
  readonly query: string;
  readonly variables: Record<string, unknown>;
}

/** Stubs the global fetch with answers given in order; each call records what was sent. */
function fakeFetch(...answers: { readonly status?: number; readonly body: unknown }[]) {
  const sent: Sent[] = [];
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const { query, variables } = JSON.parse(String(init?.body)) as Pick<Sent, "query" | "variables">;
    sent.push({ url, method: init?.method, headers: init?.headers, query, variables });
    const answer = answers.shift();
    if (answer === undefined) throw new Error("no answer left");
    const text = typeof answer.body === "string" ? answer.body : JSON.stringify(answer.body);
    return new Response(text, { status: answer.status ?? 200, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetch);
  return { fetch, sent };
}

function draw(disputeID: number, appeal = 0, voteID = 0, address = juror.toLowerCase()) {
  return {
    id: `${disputeID}-${appeal}-${voteID}`,
    address,
    disputeID: `${disputeID}`,
    appeal: `${appeal}`,
    voteID: `${voteID}`,
  };
}

/** `count` draws in disputes from..from+count-1: four-digit ids, so ascending in the subgraph's string order. */
function drawPage(from: number, count: number) {
  return Array.from({ length: count }, (_, i) => draw(from + i));
}

function shift(disputeID: number, n: number, ETHAmount: string, tokenAmount: string) {
  const address = juror.toLowerCase();
  return { id: `${disputeID}-${address}-${n}`, ETHAmount, address, disputeID: `${disputeID}`, tokenAmount };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readDraws", () => {
  it("pages by 1000 after the last row's id until a page holds fewer, keeping every row in returned order", async () => {
    const pages = [drawPage(1000, 1000), drawPage(2000, 1000), drawPage(3000, 3)];
    const { sent } = fakeFetch(...pages.map((draws) => ({ body: { data: { draws } } })));
    const draws = await readDraws(config, 100, juror);
    expect(draws).toEqual(pages.flat());
    expect(draws).toHaveLength(2003);
    expect(sent.map((request) => request.variables)).toEqual([
      { address: juror, lastId: "" },
      { address: juror, lastId: "1999-0-0" },
      { address: juror, lastId: "2999-0-0" },
    ]);
    for (const request of sent) {
      expect(request.url).toBe("http://subgraph.invalid/100");
      expect(request.method).toBe("POST");
      expect(request.headers).toEqual({ "Content-Type": "application/json" });
      expect(request.query).toBe(sent[0]?.query);
    }
  });

  it("asks for one more page after a full last page, as master does", async () => {
    const { sent } = fakeFetch({ body: { data: { draws: drawPage(1000, 1000) } } }, { body: { data: { draws: [] } } });
    expect(await readDraws(config, 1, juror)).toHaveLength(1000);
    expect(sent.map((request) => request.variables.lastId)).toEqual(["", "1999-0-0"]);
  });

  it("sends the address only as a variable, with master's fields and no dispute filter", async () => {
    const { sent } = fakeFetch({ body: { data: { draws: [] } } });
    await readDraws(config, 1, juror);
    const [request] = sent;
    expect(request?.query).toMatch(/draws\(where: \{address: \$address, id_gt: \$lastId\}, first: 1000\)/);
    expect(request?.query).toMatch(/\{ id address disputeID appeal voteID \}/);
    expect(request?.query).not.toMatch(/disputeID:|orderBy/);
    expect(request?.query.toLowerCase()).not.toContain(juror.slice(2).toLowerCase());
    expect(request?.variables).toEqual({ address: juror, lastId: "" });
  });

  it("filters by dispute through a variable when a dispute id is given", async () => {
    const page = [draw(1052, 0, 1), draw(1052, 1, 4)];
    const { sent } = fakeFetch({ body: { data: { draws: page } } });
    expect(await readDraws(config, 100, juror, 1052n)).toEqual(page);
    const [request] = sent;
    expect(request?.query).toMatch(
      /draws\(where: \{address: \$address, disputeID: \$disputeID, id_gt: \$lastId\}, first: 1000\)/,
    );
    expect(request?.query).not.toContain("1052");
    expect(request?.variables).toEqual({ address: juror, disputeID: "1052", lastId: "" });
  });

  it("pages a dispute's draws the same way", async () => {
    const { sent } = fakeFetch({ body: { data: { draws: drawPage(1000, 1000) } } }, { body: { data: { draws: [] } } });
    await readDraws(config, 1, juror, 0n);
    expect(sent.map((request) => request.variables)).toEqual([
      { address: juror, disputeID: "0", lastId: "" },
      { address: juror, disputeID: "0", lastId: "1999-0-0" },
    ]);
  });

  it("keeps the subgraph's order: round 10 before round 2, as master gets it", async () => {
    const page = [draw(7, 0, 0), draw(7, 10, 3), draw(7, 2, 1)];
    fakeFetch({ body: { data: { draws: page } } });
    expect(await readDraws(config, 1, juror, 7n)).toEqual(page);
  });

  it("queries the zero address (no wallet), as master does", async () => {
    const { sent } = fakeFetch({ body: { data: { draws: [] } } });
    expect(await readDraws(config, 1, zero)).toEqual([]);
    expect(sent[0]?.variables).toEqual({ address: zero, lastId: "" });
  });

  it("refuses a malformed account or dispute id before any request", async () => {
    const { fetch } = fakeFetch();
    const injected = `${zero}", id_gt: "`;
    for (const account of ["0x123", "abc", "", injected, `${zero} `])
      await expect(readDraws(config, 1, account as never)).rejects.toThrow("The account is not an address");
    for (const disputeId of [-1n, 5, "5", 5.5, null])
      await expect(readDraws(config, 1, juror, disputeId as never)).rejects.toThrow(
        "The dispute id is not a non-negative integer",
      );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws before any request on a chain without a display subgraph", async () => {
    const { fetch } = fakeFetch();
    await expect(readDraws(config, 10200, juror)).rejects.toThrow("No display subgraph configured for chain 10200");
    await expect(readDraws({ rpcUrls: {}, contracts: {} }, 1, juror)).rejects.toThrow(
      "No display subgraph configured for chain 1",
    );
    await expect(readDraws({ ...config, displaySubgraphUrls: { 1: "" } }, 1, juror)).rejects.toThrow(
      "No display subgraph configured for chain 1",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws on an HTTP error without naming the URL", async () => {
    fakeFetch({ status: 500, body: "Internal Server Error" });
    const error = await readDraws(config, 1, juror).catch((caught: unknown) => caught);
    expect(error).toEqual(new Error("The display subgraph of chain 1 answered HTTP 500"));
    expect(String(error)).not.toContain("subgraph.invalid");
  });

  it("throws on an answer without data (GraphQL errors), a missing list or a body that is not JSON", async () => {
    fakeFetch({ body: { errors: [{ message: "indexing_error" }, { message: "second" }], data: null } });
    await expect(readDraws(config, 1, juror)).rejects.toThrow(
      new Error("The display subgraph of chain 1 answered without data: indexing_error; second"),
    );
    fakeFetch({ body: { data: null } });
    await expect(readDraws(config, 1, juror)).rejects.toThrow(
      new Error("The display subgraph of chain 1 answered without data"),
    );
    fakeFetch({ body: { errors: [{ message: "store error" }], data: { draws: null } } });
    await expect(readDraws(config, 1, juror)).rejects.toThrow("The display subgraph of chain 1 returned no draws list");
    fakeFetch({ body: "<html>" });
    await expect(readDraws(config, 1, juror)).rejects.toThrow();
  });

  it("uses the list when GraphQL errors come next to it, as master reads data without looking at errors", async () => {
    const page = [draw(5, 0, 1)];
    fakeFetch({ body: { errors: [{ message: "store error" }], data: { draws: page } } });
    expect(await readDraws(config, 1, juror)).toEqual(page);
  });

  it("returns nothing when a later page fails, as master's getBatch rejects", async () => {
    fakeFetch({ body: { data: { draws: drawPage(1000, 1000) } } }, { status: 502, body: "Bad Gateway" });
    await expect(readDraws(config, 1, juror)).rejects.toThrow("answered HTTP 502");
  });
});

describe("readShifts", () => {
  it("pages by 1000 with master's fields and returns rows as the subgraph gives them", async () => {
    const first = Array.from({ length: 1000 }, (_, i) =>
      shift(1000 + i, 0, "16000000000000000", "1100000000000000000000"),
    );
    const last = [shift(2000, 0, "0", "-2200000000000000000000"), shift(2000, 1, "8000000000000000", "0")];
    const { sent } = fakeFetch(
      { body: { data: { tokenAndETHShifts: first } } },
      { body: { data: { tokenAndETHShifts: last } } },
    );
    expect(await readShifts(config, 100, juror)).toEqual([...first, ...last]);
    expect(sent.map((request) => request.variables)).toEqual([
      { address: juror, lastId: "" },
      { address: juror, lastId: `1999-${juror.toLowerCase()}-0` },
    ]);
    const [request] = sent;
    expect(request?.url).toBe("http://subgraph.invalid/100");
    expect(request?.query).toMatch(/tokenAndETHShifts\(where: \{address: \$address, id_gt: \$lastId\}, first: 1000\)/);
    expect(request?.query).toMatch(/\{\s*id ETHAmount address disputeID tokenAmount\s*\}/);
    expect(request?.query).not.toMatch(/orderBy/);
    expect(request?.query.toLowerCase()).not.toContain(juror.slice(2).toLowerCase());
  });

  it("refuses a malformed account and throws on a missing list", async () => {
    const { fetch } = fakeFetch();
    await expect(readShifts(config, 1, "0x12" as never)).rejects.toThrow("The account is not an address");
    expect(fetch).not.toHaveBeenCalled();
    fakeFetch({ body: { data: {} } });
    await expect(readShifts(config, 1, juror)).rejects.toThrow("returned no tokenAndETHShifts list");
  });
});

describe("readEvidenceList", () => {
  const evidence = [
    {
      URI: "/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/evidence.json",
      sender: juror.toLowerCase(),
      creationTime: "1729500000",
    },
    { URI: "https://example.invalid/evidence.json", sender: zero, creationTime: "1729400000" },
  ];

  it("sends master's query with the dispute id as its variable and returns the list in returned order", async () => {
    const { sent } = fakeFetch({ body: { data: { dispute: { evidenceGroup: { evidence } } } } });
    expect(await readEvidenceList(config, 1, 1680n)).toEqual(evidence);
    const [request] = sent;
    expect(request?.url).toBe("http://subgraph.invalid/1");
    expect(request?.headers).toEqual({ "Content-Type": "application/json" });
    expect(request?.query.replace(/\s+/g, " ")).toBe(
      "query getDispute($id: String!) { dispute(id: $id) { evidenceGroup { evidence { URI sender creationTime } } } }",
    );
    expect(request?.variables).toEqual({ id: "1680" });
  });

  it("sends one request with no pagination, as master does", async () => {
    const many = Array.from({ length: 1000 }, (_, i) => ({ URI: `/ipfs/Qm${i}`, sender: zero, creationTime: `${i}` }));
    const { fetch } = fakeFetch({ body: { data: { dispute: { evidenceGroup: { evidence: many } } } } });
    expect(await readEvidenceList(config, 1, 1n)).toHaveLength(1000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("throws for a dispute the subgraph does not have or one without an evidence group", async () => {
    fakeFetch({ body: { data: { dispute: null } } });
    await expect(readEvidenceList(config, 1, 99999n)).rejects.toThrow(
      "The display subgraph of chain 1 has no dispute 99999",
    );
    fakeFetch({ body: { data: { dispute: { evidenceGroup: null } } } });
    await expect(readEvidenceList(config, 1, 5n)).rejects.toThrow(
      "The display subgraph of chain 1 has no evidence group for dispute 5",
    );
    fakeFetch({ body: { data: { dispute: { evidenceGroup: {} } } } });
    await expect(readEvidenceList(config, 1, 5n)).rejects.toThrow("returned no evidence list for dispute 5");
  });

  it("refuses a malformed dispute id and a chain without a display subgraph before any request", async () => {
    const { fetch } = fakeFetch();
    await expect(readEvidenceList(config, 1, -3n)).rejects.toThrow("The dispute id is not a non-negative integer");
    await expect(readEvidenceList(config, 1, "1680" as never)).rejects.toThrow(
      "The dispute id is not a non-negative integer",
    );
    await expect(readEvidenceList(config, 11155111, 1n)).rejects.toThrow(
      "No display subgraph configured for chain 11155111",
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
