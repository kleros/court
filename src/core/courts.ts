import { klerosLiquidAbi, policyRegistryAbi } from "./abis.ts";
import type { CourtChainId } from "./chains.ts";
import { readClient } from "./client.ts";
import { contractAddress, type CourtConfig } from "./config.ts";

/**
 * Courts: parameters, children and policy URI, one read per contract call, as master reads them: courts(id) and
 * policies(id) are separate useCacheCalls (stake-modal.js:57,64; court-card.js:93,99; court-cascader-modal.js:104),
 * and the Join Court tree makes separate calls per court (court-cascader-modal.js:50,60). Each read here needs only
 * its own contract address and its own eth_call, so one failing or unconfigured read does not fail the others.
 * Fetching and checking the policy JSON behind the URI is not here (case-data piece).
 *
 * Exports and the screens that use them (spec = vault parity/02-behavioral-spec.md):
 * - readCourtParams: court card Coherence Reward feeForJuror (05.2); stake modal minStake (05.4); Join Court
 *   footer minStake, alpha, hiddenVotes, feeForJuror (05.3); Court Details parent walk (05.5).
 * - readSubcourt: Join Court children per selected level (05.3); later the case page timesPerPeriod deadlines
 *   (04.5, 06, 07).
 * - readPolicyUri: the court name on the court card (05.2), stake modal (05.4), dashboard Courts card (04.4),
 *   Join Court (05.3) and Court Details (05.5).
 * - GENERAL_COURT: the tree's root (05.3 selection starts at court 0; 05.5 walk ends there).
 * Screens read the tree the way master does: Join Court per selected level, Court Details by walking
 * courts(id).parent, both with the per-court reads above. There is no whole-tree read here (master has none; it
 * would cost far more RPC calls than today). The lab proof's whole-tree walk is in testing/court-tree.ts.
 */

/** Court 0, the root; its parent is itself. */
export const GENERAL_COURT = 0n;

/** KlerosLiquid.courts(id). */
export interface CourtParams {
  /** The General Court's parent is 0. */
  readonly parent: bigint;
  readonly hiddenVotes: boolean;
  /** PNK wei. */
  readonly minStake: bigint;
  /** Basis points of the stake lost when incoherent (ALPHA_DIVISOR 10000). */
  readonly alpha: bigint;
  /** Native-coin wei paid per juror. */
  readonly feeForJuror: bigint;
  readonly jurorsForCourtJump: bigint;
}

/** KlerosLiquid.getSubcourt(id). */
export interface Subcourt {
  /** In contract order. */
  readonly children: readonly bigint[];
  /** Seconds per period: evidence, commit, vote, appeal. */
  readonly timesPerPeriod: readonly [bigint, bigint, bigint, bigint];
}

/** KlerosLiquid.courts(id) alone. */
export async function readCourtParams(
  config: CourtConfig,
  chainId: CourtChainId,
  courtId: bigint,
): Promise<CourtParams> {
  const [parent, hiddenVotes, minStake, alpha, feeForJuror, jurorsForCourtJump] = await readClient(
    config,
    chainId,
  ).readContract({
    address: contractAddress(config, chainId, "klerosLiquid"),
    abi: klerosLiquidAbi,
    functionName: "courts",
    args: [courtId],
  });
  return { parent, hiddenVotes, minStake, alpha, feeForJuror, jurorsForCourtJump };
}

/** KlerosLiquid.getSubcourt(id) alone. */
export async function readSubcourt(config: CourtConfig, chainId: CourtChainId, courtId: bigint): Promise<Subcourt> {
  const [children, timesPerPeriod] = await readClient(config, chainId).readContract({
    address: contractAddress(config, chainId, "klerosLiquid"),
    abi: klerosLiquidAbi,
    functionName: "getSubcourt",
    args: [courtId],
  });
  return { children, timesPerPeriod };
}

/** PolicyRegistry.policies(id) alone, as stored; "" when the court has none (master then shows no name, 02.5). */
export async function readPolicyUri(config: CourtConfig, chainId: CourtChainId, courtId: bigint): Promise<string> {
  return readClient(config, chainId).readContract({
    address: contractAddress(config, chainId, "policyRegistry"),
    abi: policyRegistryAbi,
    functionName: "policies",
    args: [courtId],
  });
}
