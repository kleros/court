import type { Address } from "viem";
import { klerosLiquidAbi, klerosLiquidExtraViewsAbi, pinakionAbi, xPinakionAbi } from "./abis.ts";
import type { CourtChainId } from "./chains.ts";
import { readClient } from "./client.ts";
import { contractAddress, type CourtConfig } from "./config.ts";

/**
 * A juror's courts, stakes, locked tokens and PNK balances, read as master reads them. Amounts are wei (bigint).
 * Master reads with 0x000…0 when no wallet is connected (02.9); callers pass that address the same way.
 *
 * Exports and the screens that use them (spec = vault parity/02-behavioral-spec.md):
 * - readJuror: Courts page list and empty state (05.1), dashboard Courts card (04.4), stake modal "Total
 *   Staked" and "Available to Stake" (05.4), PNK balance card Staked and Locked (05.7), four-court cap (D-26).
 * - readCourtStake: court card "Current Stake" (05.2), dashboard Courts card rows (04.4), stake modal current
 *   court stake (05.4).
 * - readMaxStakePaths: four-court cap (D-26) in the stake modal (05.4).
 * - readPnkBalance: PNK balance card wallet balance (05.7), stake modal "Available to Stake" and the Gnosis
 *   zero-stPNK branch (05.4); on Gnosis this is stPNK (05.9 stakeable balance).
 * - SIDE_CHAIN_ID, readXPnkBalance: Gnosis deposit button and window (05.9), Mainnet "Court on Gnosis" offer
 *   reading Gnosis balances (05.10).
 * - readSideChainTokenStats: Convert page available amount (05.12, consumed by 08.9).
 */

export interface Juror {
  /** Courts the juror is staked in, queued set-stakes included: KlerosLiquidExtraViews.getJuror(account)
   * .subcourtIDs de-duplicated, 0 (empty slot) dropped, 1 subtracted, in slot order (master courts.js:82-85). */
  readonly courtIds: readonly bigint[];
  /** getJuror(account).stakedTokens: total staked over all courts, queued set-stakes included. */
  readonly stakedTokens: bigint;
  /** getJuror(account).lockedTokens. */
  readonly lockedTokens: bigint;
}

/** KlerosLiquidExtraViews.getJuror(account). Its subcourtStakes output is not used: master reads stakeOf per court. */
export async function readJuror(config: CourtConfig, chainId: CourtChainId, account: Address): Promise<Juror> {
  const [subcourtIDs, stakedTokens, lockedTokens] = await readClient(config, chainId).readContract({
    address: contractAddress(config, chainId, "klerosLiquidExtraViews"),
    abi: klerosLiquidExtraViewsAbi,
    functionName: "getJuror",
    args: [account],
  });
  const courtIds = [...new Set(subcourtIDs)].filter((id) => id !== 0n).map((id) => id - 1n);
  return { courtIds, stakedTokens, lockedTokens };
}

/** KlerosLiquidExtraViews.stakeOf(account, courtId): the court stake with queued set-stakes applied. */
export async function readCourtStake(
  config: CourtConfig,
  chainId: CourtChainId,
  account: Address,
  courtId: bigint,
): Promise<bigint> {
  return readClient(config, chainId).readContract({
    address: contractAddress(config, chainId, "klerosLiquidExtraViews"),
    abi: klerosLiquidExtraViewsAbi,
    functionName: "stakeOf",
    args: [account, courtId],
  });
}

/** KlerosLiquid.MAX_STAKE_PATHS(): how many courts a juror can stake in directly (4 in both deployed sources). */
export async function readMaxStakePaths(config: CourtConfig, chainId: CourtChainId): Promise<bigint> {
  return readClient(config, chainId).readContract({
    address: contractAddress(config, chainId, "klerosLiquid"),
    abi: klerosLiquidAbi,
    functionName: "MAX_STAKE_PATHS",
  });
}

/** balanceOf(account) on the chain's Pinakion: PNK on Ethereum and Sepolia, stPNK on Gnosis and Chiado. */
export async function readPnkBalance(config: CourtConfig, chainId: CourtChainId, account: Address): Promise<bigint> {
  return readClient(config, chainId).readContract({
    address: contractAddress(config, chainId, "pinakion"),
    abi: pinakionAbi,
    functionName: "balanceOf",
    args: [account],
  });
}

/** The only side chain master supports (src/api/side-chain/chain-params.js:11-35): Gnosis, paired with Mainnet. */
export const SIDE_CHAIN_ID = 100;

/** xPNK balanceOf(account) on Gnosis (REACT_APP_RAW_PINAKION_XDAI_ADDRESS), master's getRawBalance. */
export async function readXPnkBalance(config: CourtConfig, account: Address): Promise<bigint> {
  return readClient(config, SIDE_CHAIN_ID).readContract({
    address: contractAddress(config, SIDE_CHAIN_ID, "rawPinakion"),
    abi: xPinakionAbi,
    functionName: "balanceOf",
    args: [account],
  });
}

export interface SideChainTokenStats {
  /** stPNK balance. */
  readonly balance: bigint;
  /** KlerosLiquid.jurors(account).stakedTokens: applied stakes only. */
  readonly staked: bigint;
  /** KlerosLiquidExtraViews.getJuror(account).lockedTokens. */
  readonly locked: bigint;
  /** getJuror(account).stakedTokens − staked; present only when not 0, as on master. Negative for a queued unstake. */
  readonly pendingStake?: bigint;
  /** max(0, min(balance − locked, balance − staked)). */
  readonly available: bigint;
}

/**
 * Master's getTokenStats on Gnosis (src/api/side-chain/xdai-api.js:26-74). Master reads the balance through
 * WrappedPinakion.balanceOf (wrapped-pinakion.json) at REACT_APP_PINAKION_XDAI_ADDRESS: the same address and the
 * same balanceOf(address) call as readPnkBalance on chain 100.
 */
export async function readSideChainTokenStats(config: CourtConfig, account: Address): Promise<SideChainTokenStats> {
  const client = readClient(config, SIDE_CHAIN_ID);
  // Every address before any read starts, in master's order (create-side-chain-api.js:26-32): a missing one
  // rejects this call alone, with no read in flight and nothing left unhandled.
  const pinakion = contractAddress(config, SIDE_CHAIN_ID, "pinakion");
  const klerosLiquidExtraViews = contractAddress(config, SIDE_CHAIN_ID, "klerosLiquidExtraViews");
  const klerosLiquid = contractAddress(config, SIDE_CHAIN_ID, "klerosLiquid");
  const [balance, [staked], [, stakedPlusPending, locked]] = await Promise.all([
    client.readContract({ address: pinakion, abi: pinakionAbi, functionName: "balanceOf", args: [account] }),
    client.readContract({ address: klerosLiquid, abi: klerosLiquidAbi, functionName: "jurors", args: [account] }),
    client.readContract({
      address: klerosLiquidExtraViews,
      abi: klerosLiquidExtraViewsAbi,
      functionName: "getJuror",
      args: [account],
    }),
  ]);
  const pendingStake = stakedPlusPending - staked;
  const fromLocked = balance - locked;
  const fromStaked = balance - staked;
  const available = fromLocked < fromStaked ? fromLocked : fromStaked;
  return {
    balance,
    staked,
    ...(pendingStake === 0n ? { locked } : { pendingStake, locked }),
    available: available < 0n ? 0n : available,
  };
}
