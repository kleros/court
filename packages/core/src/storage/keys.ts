import { toChecksum } from "../kernel/index.ts";
import type { Address } from "../kernel/index.ts";
import type { CacheNamespace } from "./types.ts";

// The two messages jurors sign today. Their exact text is part of the stored keys, so these strings never change.
const SALT_MESSAGE =
  "Please sign this message to secure your vote. This is unrelated from your main Ethereum account and will not be able to send any transactions.";
const DERIVED_KEY_MESSAGE =
  "To keep your data safe and to use certain features of Kleros, we ask that you sign these messages to create a secret key for your account. This key is unrelated from your main Ethereum account and will not be able to send any transactions.";

/**
 * Every key the app reads or writes in browser storage; a key that is not built here is a change of behaviour.
 * localStorage unless noted; values are raw strings unless noted as JSON.
 *
 * Keys shared with the old app keep its exact form, so commits and drafts move between the two apps on the same
 * origin. The old app wrote the account part in EIP-55 form (its wallet library checksums every account it returns),
 * so these keys are written that way and looked up with findKeyCaseInsensitive.
 */
export const STORAGE_KEYS = {
  /** Raw signature: the secret every hidden-vote salt is derived from. Kept after reveal and after disconnect. */
  salt: (account: Address) => `${toChecksum(account)}-${SALT_MESSAGE}`,
  /** JSON: the committed choice of a hidden vote; no chain and no round, as today. Kept after the reveal, as today (D-19). */
  committedVote: (account: Address, disputeId: bigint) => `@kleros/court/${toChecksum(account)}/${disputeId}/vote`,
  /** Raw text: the justification typed before the vote is sent. */
  justificationDraft: (chainId: number, account: Address, disputeId: bigint) =>
    `@kleros/court/${chainId}/${toChecksum(account)}/${disputeId}/justification-draft`,
  /** Raw signature: the secret the justification-signing key is derived from; same account form as the salt. */
  derivedKey: (account: Address) => `${toChecksum(account)}-${DERIVED_KEY_MESSAGE}`,
  /** Raw: the Atlas session token, and the lowercase account it belongs to. */
  atlasToken: "atlas_auth_token",
  atlasAccount: "atlas_auth_account",
  /** JSON string. */
  theme: "@kleros/court/theme",
  /** JSON boolean, per lowercase account. */
  smartContractWalletWarning: (account: Address) =>
    `@kleros/court/alert/smart-contract-wallet-warning:${account.toLowerCase()}`,
  /** JSON true once the wallet was asked to watch the token; the token's address exactly as configured. */
  watchAssetAsked: (symbol: string, chainId: number, tokenAddress: string) =>
    `@@kleros/court/tokens/${symbol}/${chainId}/${tokenAddress}`,
  /** Raw chain id. */
  fallbackChainId: "@@kleros/court/fallback-chain-id",
  /** sessionStorage, raw URL. */
  viewOnlyReload: "@@kleros/court/view-only-reload",
  /** sessionStorage, "1". */
  restoredFromBackForwardCache: "@@kleros/court/restored-from-back-forward-cache",
  /** JSON: the notifications read in this browser (D-46), per chain and lowercase account. */
  notificationsRead: (chainId: number, account: Address) =>
    `@kleros/court/notifications/read/v1/${chainId}/${account.toLowerCase()}`,
  /** One entry of a bounded cache (createBoundedCache). */
  cacheEntry: (namespace: CacheNamespace, key: string) => `@kleros/court/cache/v1/${namespace}/${key}`,
} as const;

/**
 * Keys of the old app this app never reads, writes or deletes. Its caches hold data checked by older rules, so none
 * is ever trusted, and the old app on the same origin keeps using them while both apps run. The last two are a
 * dropped banner's flag (D-47) and the old wallet picker's choice (D-01).
 */
export const NEVER_READ_PREFIXES = [
  "@@kleros/court/metaevidence/v1/",
  "@@kleros/court/metaevidence/v2/",
  "@@kleros/court/reality-question/v1/",
  "@@kleros/court/executed-ruling/v1/",
  "@@kleros/court/claim-snapshots/v1/",
  "@kleros/court/alert/xdai-court",
  "@kleros/court-v1/last-wallet-connected",
] as const;

export function isNeverRead(key: string): boolean {
  return NEVER_READ_PREFIXES.some((prefix) => key.startsWith(prefix));
}
