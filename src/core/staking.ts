/**
 * The stake rules master enforces that need chain values, and the four-court cap, as pure functions over the
 * reads in courts.ts and juror.ts. Amounts are PNK wei (bigint). Sending setStake is not here (staking piece).
 *
 * Exports and the screens that use them (spec = vault parity/02-behavioral-spec.md):
 * - availableToStake: stake modal "Available to Stake" and rule 2's bound (05.4).
 * - meetsMinStake: stake modal rule 1, "Your new court stake must be higher than the min stake." (05.4).
 * - withinAvailable: stake modal rule 2, "You only have <amount> available to stake." (05.4).
 * - stakePathCapReached: four-court cap, blocked before any wallet call (D-26) in the stake modal (05.4).
 */

/**
 * Wallet PNK balance minus getJuror(account).stakedTokens (queued stakes included), master stake-modal.js:24-28.
 * Negative when PNK lost in rulings left the balance below the total stake; master shows it negative (COURTS-Q4).
 */
export function availableToStake(balance: bigint, stakedTokens: bigint): bigint {
  return balance - stakedTokens;
}

/**
 * Rule 1 (master stake-modal.js:159-176): the change must be at least minStake − current court stake, i.e. the
 * resulting court stake (current + change) must be at least the court's minStake. Equal passes. A resulting 0
 * fails whenever minStake > 0, as on master (COURTS-Q3).
 */
export function meetsMinStake(newCourtStake: bigint, minStake: bigint): boolean {
  return newCourtStake >= minStake;
}

/**
 * Rule 2 (master stake-modal.js:189-206): with available ≥ 0 the change must be ≤ available; with available < 0
 * the check flips to change ≥ available, so any increase passes (COURTS-Q4).
 */
export function withinAvailable(change: bigint, available: bigint): boolean {
  return available >= 0n ? change <= available : change >= available;
}

/**
 * D-26: true when the juror already uses every stake path and asks for a non-zero stake in a court they are not
 * in. KlerosLiquid refuses that (`_stake == 0 || currentStake > 0 || juror.subcourtIDs.length < MAX_STAKE_PATHS`,
 * KlerosLiquid.sol:869; same line in xKlerosLiquid). `jurorCourtIds` is readJuror's list, which counts queued
 * set-stakes.
 */
export function stakePathCapReached(
  jurorCourtIds: readonly bigint[],
  maxStakePaths: bigint,
  courtId: bigint,
  newCourtStake: bigint,
): boolean {
  if (newCourtStake === 0n || jurorCourtIds.includes(courtId)) return false;
  return BigInt(jurorCourtIds.length) >= maxStakePaths;
}
