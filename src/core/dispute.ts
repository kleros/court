import { isAddress, isAddressEqual, zeroAddress, type Address, type Hex } from "viem";
import { klerosLiquidAbi } from "./abis.ts";
import type { CourtChainId } from "./chains.ts";
import { readClient } from "./client.ts";
import { contractAddress, type CourtConfig } from "./config.ts";
import type { Subcourt } from "./courts.ts";

/**
 * A dispute, its rounds and its votes, read from KlerosLiquid (xKlerosLiquid on Gnosis) one eth_call per read as
 * master reads them (drizzle cacheCall of disputes, getDispute, currentRuling, getVote, getVoteCounter), and the
 * period deadline and Pass Period rule master computes from them, as pure functions. No event-log reads. Amounts are
 * wei, times are seconds (bigint) except where a name says ms; the period is a number (master compares strings).
 *
 * Exports and the screens that use them (spec = vault parity/02-behavioral-spec.md):
 * - Period: every period branch: My Cases tabs (06.1.4), case card period block (06.2.5), case header (06.4),
 *   timeline (06.9), round history (06.10), vote panel (07.1-07.3), dashboard Cases and Ongoing Cases (04.5, 04.7).
 * - readDispute: case page 404 on any failure (06.3.1), header phase, deadline, Pass Period, Execute Ruling,
 *   Resolved (06.4), breadcrumb start court (06.5.1), timeline (06.9), round history (06.10), vote panel (07.1),
 *   case card (06.2), My Cases tabs (06.1.3-4), dashboard Cases card (04.5), Ongoing Cases card (04.7).
 * - readDisputeRounds: header PNK Locked (06.4.1), case card Coherence Reward and Stake locked (06.2.3-4), current
 *   round of the list screens (06.1.4, 04.5, 04.7), round history rounds and turnout (06.10.1, 06.10.4), vote panel
 *   current round (07.1).
 * - readCurrentRuling: vote panel loading and decision box (06.11, 06.12), evidence "Jurors ruled" pill (06.8.3-4),
 *   round history default vote (06.10.2).
 * - readVote: list classification by the kept draw's vote (06.1.4, 04.5, 04.7), round history justifications grouped
 *   by on-chain choice (06.10.5).
 * - readAccountVoteSlots (S-A5 / D-15): the account's vote slots from the chain: vote panel drawn or not, vote IDs,
 *   committed, voted, and "success only when every slot is cast" (06.11, 07.1) with "current"; header PNK Locked
 *   (06.4.1) with "all". Whether the case page uses it or re-reads the subgraph (L2 readDraws) is kyrers' choice;
 *   the list screens keep L2 readDraws.
 * - readVoteCounter: round history vote counts (06.10.4); gated as master gates it, so a call that would revert is
 *   never sent.
 * - isRoundTallyFinal: round history "<cast> of <drawn> votes cast" (06.10.4).
 * - periodDeadline: header deadline (06.4.2), case card period block (06.2.5), dashboard "Next voting deadline"
 *   (04.5), timeline countdown (06.9.1); later Ongoing Cases order (D-48).
 * - showPassPeriod: header Pass Period and Execute Ruling buttons (06.4.3-4).
 * - Dispute, DisputeRounds, Vote, VoteSlot, VoteCounter: the values of the above.
 */

/** KlerosLiquid.Period (KlerosLiquid.sol:37-43), the number disputes(id).period decodes to. */
export const Period = { evidence: 0, commit: 1, vote: 2, appeal: 3, execution: 4 } as const;

/** KlerosLiquid.disputes(id): the public getter, dynamic arrays left out (KlerosLiquid.sol:78-97, :177). */
export interface Dispute {
  /** The court the dispute is in now; an appeal can move it to the parent court (KlerosLiquid.sol:733-734). */
  readonly subcourtID: bigint;
  readonly arbitrated: Address;
  /** The highest choice a vote may carry (castVote: choice <= numberOfChoices; 0 = refuse to arbitrate), not a
   * count of options: Reality disputes carry huge values (master case-round-history.js:32-36). */
  readonly numberOfChoices: bigint;
  /** Period.evidence .. Period.execution. */
  readonly period: number;
  /** Seconds: block time of the last period change (creation and appeal included). */
  readonly lastPeriodChange: bigint;
  /** Current-round slots drawn so far. Drawing is complete when it equals the current round's votesLengths entry;
   * the dispute cannot leave the evidence period before that (KlerosLiquid.sol:420). */
  readonly drawsInRound: bigint;
  readonly commitsInRound: bigint;
  /** executeRuling done; only possible in the execution period (KlerosLiquid.sol:679-682). */
  readonly ruled: boolean;
}

/** KlerosLiquid.getDispute(id): one entry per round in round order; appeal 0 is the first round, the last entry the
 * current round (KlerosLiquid.sol:1028-1044). */
export interface DisputeRounds {
  /** Slots (seats) per round, fixed when the round opens. */
  readonly votesLengths: readonly bigint[];
  /** PNK wei locked per drawn slot. */
  readonly tokensAtStakePerJuror: readonly bigint[];
  /** Native-coin wei paid for the round's jurors. */
  readonly totalFeesForJurors: readonly bigint[];
  /** Votes cast or revealed (castVote). */
  readonly votesInEachRound: readonly bigint[];
  /** No master screen reads this or the next field; decoded with the rest of the one call. */
  readonly repartitionsInEachRound: readonly bigint[];
  readonly penaltiesInEachRound: readonly bigint[];
}

/** KlerosLiquid.getVote(id, appeal, voteID) (KlerosLiquid.sol:981-992). */
export interface Vote {
  /** The drawn juror, checksummed; the zero address while the slot is not drawn yet. */
  readonly account: Address;
  /** bytes32; zero until castCommit (hidden-votes courts only). */
  readonly commit: Hex;
  /** Meaningful only when voted. 0n is refuse to arbitrate and is falsy, unlike master's string "0", which its
   * `vote.voted && vote.choice` relies on (case-details-card.jsx:262-264): compare with `voted`, not truthiness. */
  readonly choice: bigint;
  readonly voted: boolean;
}

/** One slot an account holds: its round (appeal) and vote ID, with the vote as read. */
export interface VoteSlot extends Vote {
  readonly appeal: bigint;
  readonly voteID: bigint;
}

/** KlerosLiquid.getVoteCounter(id, appeal) (KlerosLiquid.sol:1004-1015). */
export interface VoteCounter {
  /** Tied rounds keep the first choice that reached the tied count. */
  readonly winningChoice: bigint;
  /** counts[choice] for choice 0 .. numberOfChoices. */
  readonly counts: readonly bigint[];
  readonly tied: boolean;
}

/** KlerosLiquid.disputes(id). An id past the last dispute reverts (public array getter), so this rejects; master's
 * case page shows its 404 on any rejection of this call (case.js:41-54, :127-129). */
export async function readDispute(config: CourtConfig, chainId: CourtChainId, disputeId: bigint): Promise<Dispute> {
  const [subcourtID, arbitrated, numberOfChoices, period, lastPeriodChange, drawsInRound, commitsInRound, ruled] =
    await readClient(config, chainId).readContract({
      address: contractAddress(config, chainId, "klerosLiquid"),
      abi: klerosLiquidAbi,
      functionName: "disputes",
      args: [disputeId],
    });
  return { subcourtID, arbitrated, numberOfChoices, period, lastPeriodChange, drawsInRound, commitsInRound, ruled };
}

/** KlerosLiquid.getDispute(id). */
export async function readDisputeRounds(
  config: CourtConfig,
  chainId: CourtChainId,
  disputeId: bigint,
): Promise<DisputeRounds> {
  const [
    votesLengths,
    tokensAtStakePerJuror,
    totalFeesForJurors,
    votesInEachRound,
    repartitionsInEachRound,
    penaltiesInEachRound,
  ] = await readClient(config, chainId).readContract({
    address: contractAddress(config, chainId, "klerosLiquid"),
    abi: klerosLiquidAbi,
    functionName: "getDispute",
    args: [disputeId],
  });
  return {
    votesLengths,
    tokensAtStakePerJuror,
    totalFeesForJurors,
    votesInEachRound,
    repartitionsInEachRound,
    penaltiesInEachRound,
  };
}

/** KlerosLiquid.currentRuling(id): the last round's winning choice, 0 when it is tied (KlerosLiquid.sol:840-844).
 * 0n is falsy; master's string "0" is not (its `loading: !currentRuling`, case-details-card.jsx:262). */
export async function readCurrentRuling(
  config: CourtConfig,
  chainId: CourtChainId,
  disputeId: bigint,
): Promise<bigint> {
  return readClient(config, chainId).readContract({
    address: contractAddress(config, chainId, "klerosLiquid"),
    abi: klerosLiquidAbi,
    functionName: "currentRuling",
    args: [disputeId],
  });
}

/** KlerosLiquid.getVote(id, appeal, voteID). */
export async function readVote(
  config: CourtConfig,
  chainId: CourtChainId,
  disputeId: bigint,
  appeal: bigint,
  voteID: bigint,
): Promise<Vote> {
  const [account, commit, choice, voted] = await readClient(config, chainId).readContract({
    address: contractAddress(config, chainId, "klerosLiquid"),
    abi: klerosLiquidAbi,
    functionName: "getVote",
    args: [disputeId, appeal, voteID],
  });
  return { account, commit, choice, voted };
}

/**
 * S-A5 / D-15: every slot `account` holds in the dispute, read from the chain: getVote(id, appeal, voteID) for every
 * slot of the chosen rounds, kept where the slot's account is `account` (any letter case). `votesLengths` is
 * readDisputeRounds' list; `"current"` reads its last round only (the vote panel), `"all"` every round (PNK Locked).
 *
 * - Cost: one eth_call per slot read, all sent at once (no multicall, no event logs): votesLengths[last] for
 *   "current", the sum of votesLengths for "all"; every re-read costs the same again.
 * - All or nothing: any failed getVote rejects the whole read. A shorter list is never returned (S-A5: every slot or
 *   none).
 * - Complete only once drawing is: in the evidence period a current-round slot past disputes(id).drawsInRound
 *   still holds the zero address. Once the dispute has left the evidence period every slot is drawn
 *   (KlerosLiquid.sol:420).
 * - The zero address (master's account without a wallet, 02.9) is what undrawn slots hold, so it never matches: it
 *   gets [] with no read.
 * Rows come in round order, then vote ID order.
 */
export async function readAccountVoteSlots(
  config: CourtConfig,
  chainId: CourtChainId,
  disputeId: bigint,
  account: Address,
  votesLengths: readonly bigint[],
  rounds: "current" | "all",
): Promise<VoteSlot[]> {
  if (!isAddress(account, { strict: false })) throw new Error(`Not an address: ${account}`);
  if (isAddressEqual(account, zeroAddress)) return [];
  const first = rounds === "current" ? votesLengths.length - 1 : 0;
  const reads: Promise<VoteSlot>[] = [];
  votesLengths.forEach((slots, round) => {
    if (round < first) return;
    const appeal = BigInt(round);
    for (let voteID = 0n; voteID < slots; voteID++)
      reads.push(readVote(config, chainId, disputeId, appeal, voteID).then((vote) => ({ appeal, voteID, ...vote })));
  });
  const slots = await Promise.all(reads);
  return slots.filter((slot) => isAddressEqual(slot.account, account));
}

/** Master's MAX_TALLYABLE_CHOICES (case-round-history.js:32-38): getVoteCounter allocates numberOfChoices + 1
 * counts and reverts for huge values, so above this it is not called. */
const MAX_TALLYABLE_CHOICES = 512n;

/** A round's tally is final once it is an earlier round or the dispute reached the appeal period (master
 * isRoundTallyFinal, case-round-history.js:27-30). */
export function isRoundTallyFinal(appeal: bigint, currentRound: bigint, period: number): boolean {
  return appeal < currentRound || period >= Period.appeal;
}

/**
 * KlerosLiquid.getVoteCounter(id, appeal), only where master calls it (case-round-history.js:124-134): the round's
 * tally is final and numberOfChoices <= 512. Otherwise undefined with no call sent. `currentRound` = votesLengths
 * length − 1.
 */
export async function readVoteCounter(
  config: CourtConfig,
  chainId: CourtChainId,
  disputeId: bigint,
  appeal: bigint,
  dispute: Pick<Dispute, "numberOfChoices" | "period">,
  currentRound: bigint,
): Promise<VoteCounter | undefined> {
  if (dispute.numberOfChoices > MAX_TALLYABLE_CHOICES) return undefined;
  if (!isRoundTallyFinal(appeal, currentRound, dispute.period)) return undefined;
  const [winningChoice, counts, tied] = await readClient(config, chainId).readContract({
    address: contractAddress(config, chainId, "klerosLiquid"),
    abi: klerosLiquidAbi,
    functionName: "getVoteCounter",
    args: [disputeId, appeal],
  });
  return { winningChoice, counts, tied };
}

/** Master's MANUAL_PASS_DELAY (case.js:22), seconds. */
const MANUAL_PASS_DELAY = 3600;

/**
 * When the current period ends, in ms since the epoch: (lastPeriodChange + timesPerPeriod[period]) × 1000, added as
 * master adds them, in floating point (case.js:86-89, case-card.js:204-206, cases-list-card.js:63-65,
 * dispute-timeline.js:48-50). null in the execution period, which has no length: master's header and cards compute
 * no deadline there (case.js:87-89, case-card.js:200) and its timeline's NaN shows no countdown.
 */
export function periodDeadline(
  dispute: Pick<Dispute, "period" | "lastPeriodChange">,
  timesPerPeriod: Subcourt["timesPerPeriod"],
): number | null {
  const length = timesPerPeriod[dispute.period];
  if (dispute.period >= Period.execution || length === undefined) return null;
  return (Number(dispute.lastPeriodChange) + Number(length)) * 1000;
}

/**
 * Master's showPassPeriod (case.js:82-95): in periods 0-3, true once `floor(nowMs / 1000) − lastPeriodChange >
 * timesPerPeriod[period] + 3600` (Pass Period, strictly more than an hour after the deadline); in the execution
 * period always true (Execute Ruling); false once ruled (master shows Resolved and computes nothing).
 */
export function showPassPeriod(
  dispute: Pick<Dispute, "period" | "lastPeriodChange" | "ruled">,
  timesPerPeriod: Subcourt["timesPerPeriod"],
  nowMs: number,
): boolean {
  if (dispute.ruled) return false;
  const length = timesPerPeriod[dispute.period];
  if (dispute.period >= Period.execution || length === undefined) return true;
  return Math.trunc(nowMs / 1000) - Number(dispute.lastPeriodChange) > Number(length) + MANUAL_PASS_DELAY;
}
