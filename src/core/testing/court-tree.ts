import type { CourtChainId } from "../chains.ts";
import type { CourtConfig } from "../config.ts";
import {
  GENERAL_COURT,
  readCourtParams,
  readPolicyUri,
  readSubcourt,
  type CourtParams,
  type Subcourt,
} from "../courts.ts";

// Test and lab use only (unit tests, the L1 lab proof): no screen reads every court at once. Master has no
// whole-tree read; pages read per level with the per-court reads in ../courts.ts.

export interface Court extends CourtParams, Subcourt {
  readonly id: bigint;
  /** readPolicyUri. */
  readonly policyUri: string;
}

/**
 * Every court, found from the General Court down through getSubcourt(id).children. Breadth first, one level at a
 * time; parents come before their children, children in contract order. A court listed twice is read once.
 * All or nothing: any failing read rejects the whole tree.
 */
export async function readCourtTree(config: CourtConfig, chainId: CourtChainId): Promise<Court[]> {
  const readCourt = async (id: bigint): Promise<Court> => {
    const [params, subcourt, policyUri] = await Promise.all([
      readCourtParams(config, chainId, id),
      readSubcourt(config, chainId, id),
      readPolicyUri(config, chainId, id),
    ]);
    return { id, ...params, ...subcourt, policyUri };
  };
  const courts: Court[] = [];
  const seen = new Set<bigint>([GENERAL_COURT]);
  let level: bigint[] = [GENERAL_COURT];
  while (level.length > 0) {
    const read = await Promise.all(level.map(readCourt));
    courts.push(...read);
    level = [];
    for (const id of read.flatMap((court) => court.children)) {
      if (seen.has(id)) continue;
      seen.add(id);
      level.push(id);
    }
  }
  return courts;
}
