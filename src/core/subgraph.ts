import { isAddress, type Address } from "viem";
import type { CourtChainId } from "./chains.ts";
import type { CourtConfig } from "./config.ts";

/**
 * The queries master sends to the display subgraph (REACT_APP_SUBGRAPH_<CHAIN>_DISPLAY, CourtConfig
 * displaySubgraphUrls): a juror's draws, a juror's token and ETH shifts, a dispute's evidence list. Same fields and
 * pagination as master (pages of 1000 by `id_gt`, until a page holds fewer than 1000 rows; no `orderBy`, so rows come
 * in the subgraph's default order). Rows are returned as the subgraph gives them: string fields, in returned order,
 * nothing sorted, merged or converted. The address and dispute id (both checked before sending) and the page cursor
 * travel as GraphQL variables, never in the query text; nothing on screen depends on it.
 * Every failure throws: no subgraph URL for the chain, an HTTP error, an answer without `data` (GraphQL errors), an
 * answer without the list; GraphQL errors next to the list are ignored, as on master. What a screen shows on a throw
 * is the page's decision (spec 02.6, 04.3-04.6, 06.1.2).
 *
 * Exports and the screens that use them (spec = vault parity/02-behavioral-spec.md):
 * - readDraws(account): My Cases list, tabs and case cards (06.1, 06.2), dashboard Cases card (04.5), Ongoing Cases
 *   card (04.7). Master: src/hooks/use-get-draws.js in containers/cases.js, cases-list-card.js, ongoing-cases-card.js.
 * - readDraws(account, disputeId): case page header (PNK locked, phase and deadline, Pass Period, Execute Ruling,
 *   too-old check: 06.3, 06.4) and the vote panel's drawn/vote state (06.11, 07.1), which also gates the evidence
 *   ruling pill (06.8) and round history default (06.10). Master: containers/case.js:62, case-details-card.jsx:234.
 * - readShifts: dashboard Coherence Rewards card (04.3) and Voting Performance card (04.6). Master:
 *   src/hooks/use-get-shifts.js in reward-card.js, performance-card.js.
 * - readEvidenceList: case page evidence list (06.8), through the evidence loader (L3) that fetches each file.
 *   Master: the query of src/bootstrap/dataloader.js evidenceFetcher.
 * - Draw, TokenAndETHShift, EvidenceListItem: the rows of the above.
 */

/** A Draw entity: id `<disputeID>-<appeal>-<voteID>`; BigInt fields as decimal strings. */
export interface Draw {
  readonly id: string;
  readonly address: string;
  readonly disputeID: string;
  readonly appeal: string;
  readonly voteID: string;
}

/** A TokenAndETHShift entity: id `<disputeID>-<address>-<n>`; amounts in wei as decimal strings (PNK taken from the
 * juror is a negative tokenAmount). */
export interface TokenAndETHShift {
  readonly id: string;
  readonly ETHAmount: string;
  readonly address: string;
  readonly disputeID: string;
  readonly tokenAmount: string;
}

/** An Evidence entity of the dispute's evidence group: creationTime = block timestamp in seconds, as a string. */
export interface EvidenceListItem {
  readonly URI: string;
  readonly sender: string;
  readonly creationTime: string;
}

/** Master's BATCH_SIZE (use-get-draws.js, use-get-shifts.js). */
const PAGE_SIZE = 1000;

// Variable types are the schema's: Draw.address and TokenAndETHShift.address are Bytes, disputeID BigInt, id ID.
const drawsQuery = `query draws($address: Bytes!, $lastId: ID!) {
  draws(where: {address: $address, id_gt: $lastId}, first: ${PAGE_SIZE}) { id address disputeID appeal voteID }
}`;

const disputeDrawsQuery = `query disputeDraws($address: Bytes!, $disputeID: BigInt!, $lastId: ID!) {
  draws(where: {address: $address, disputeID: $disputeID, id_gt: $lastId}, first: ${PAGE_SIZE}) {
    id address disputeID appeal voteID
  }
}`;

const shiftsQuery = `query shifts($address: Bytes!, $lastId: ID!) {
  tokenAndETHShifts(where: {address: $address, id_gt: $lastId}, first: ${PAGE_SIZE}) {
    id ETHAmount address disputeID tokenAmount
  }
}`;

/** Master's evidence query as it is (it already uses a variable): no `first`, no pagination. */
const evidenceQuery = `query getDispute($id: String!) {
  dispute(id: $id) { evidenceGroup { evidence { URI sender creationTime } } }
}`;

/**
 * The account's draws, every page, in returned order; with `disputeId`, only that dispute's. Master reads with
 * 0x000…0 when no wallet is connected (02.9); callers pass that address the same way.
 */
export async function readDraws(
  config: CourtConfig,
  chainId: CourtChainId,
  account: Address,
  disputeId?: bigint,
): Promise<Draw[]> {
  const address = checkedAddress(account);
  if (disputeId === undefined) return readPages<Draw>(config, chainId, drawsQuery, "draws", { address });
  const disputeID = checkedDisputeId(disputeId);
  return readPages<Draw>(config, chainId, disputeDrawsQuery, "draws", { address, disputeID });
}

/** The account's token and ETH shifts (amounts won and lost), every page, in returned order. */
export async function readShifts(
  config: CourtConfig,
  chainId: CourtChainId,
  account: Address,
): Promise<TokenAndETHShift[]> {
  const address = checkedAddress(account);
  return readPages<TokenAndETHShift>(config, chainId, shiftsQuery, "tokenAndETHShifts", { address });
}

/**
 * The dispute's evidence list, one request, in returned order. A dispute the subgraph does not have, or one without
 * an evidence group, throws, as master's `res.data.data.dispute.evidenceGroup.evidence` does.
 */
export async function readEvidenceList(
  config: CourtConfig,
  chainId: CourtChainId,
  disputeId: bigint,
): Promise<EvidenceListItem[]> {
  const id = checkedDisputeId(disputeId);
  const data = await post(config, chainId, evidenceQuery, { id });
  const dispute = data.dispute;
  if (!isRecord(dispute)) throw new Error(`The display subgraph of chain ${chainId} has no dispute ${id}`);
  const group = dispute.evidenceGroup;
  if (!isRecord(group))
    throw new Error(`The display subgraph of chain ${chainId} has no evidence group for dispute ${id}`);
  if (!Array.isArray(group.evidence))
    throw new Error(`The display subgraph of chain ${chainId} returned no evidence list for dispute ${id}`);
  return group.evidence as EvidenceListItem[];
}

/** Master's getBatch: pages of 1000 after the last row's id, starting from "", until a page holds fewer. */
async function readPages<Row extends { readonly id: string }>(
  config: CourtConfig,
  chainId: CourtChainId,
  query: string,
  field: string,
  variables: Readonly<Record<string, string>>,
): Promise<Row[]> {
  const rows: Row[] = [];
  let lastId = "";
  for (;;) {
    const page = (await post(config, chainId, query, { ...variables, lastId }))[field];
    if (!Array.isArray(page)) throw new Error(`The display subgraph of chain ${chainId} returned no ${field} list`);
    rows.push(...(page as Row[]));
    if (page.length < PAGE_SIZE) return rows;
    lastId = (page[PAGE_SIZE - 1] as Row).id;
  }
}

/**
 * One GraphQL POST. An answer without `data` throws with its GraphQL errors; errors next to `data` are ignored, as
 * master reads `res.data.data` without looking at them. Error messages name the chain, never the URL (a subgraph
 * URL can carry an API key).
 */
async function post(
  config: CourtConfig,
  chainId: CourtChainId,
  query: string,
  variables: Readonly<Record<string, string>>,
): Promise<Record<string, unknown>> {
  const url = config.displaySubgraphUrls?.[chainId];
  if (!url) throw new Error(`No display subgraph configured for chain ${chainId}`);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`The display subgraph of chain ${chainId} answered HTTP ${response.status}`);
  const body: unknown = await response.json();
  if (isRecord(body) && isRecord(body.data)) return body.data;
  const errors = isRecord(body) && Array.isArray(body.errors) ? body.errors : [];
  const messages = errors.map((error: unknown) => (isRecord(error) ? String(error.message) : String(error)));
  throw new Error(
    `The display subgraph of chain ${chainId} answered without data${messages.length > 0 ? `: ${messages.join("; ")}` : ""}`,
  );
}

function checkedAddress(account: string): string {
  if (typeof account !== "string" || !isAddress(account, { strict: false }))
    throw new Error("The account is not an address");
  return account;
}

/** A non-negative integer, sent as its decimal string (the subgraph's BigInt and ID inputs are strings). */
function checkedDisputeId(disputeId: bigint): string {
  if (typeof disputeId !== "bigint" || disputeId < 0n) throw new Error("The dispute id is not a non-negative integer");
  return disputeId.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
