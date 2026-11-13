import { describe, expect, it } from "vitest";
import { NEVER_READ_PREFIXES, STORAGE_KEYS, isNeverRead } from "./keys.ts";

// EIP-55 test vector: the old app wrote this form, core holds the lowercase one.
const CHECKSUMMED = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
const ACCOUNT = "0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed";

describe("STORAGE_KEYS", () => {
  it("builds today's salt and justification-key keys from the EIP-55 account and the exact signed messages", () => {
    expect(STORAGE_KEYS.salt(ACCOUNT)).toBe(
      `${CHECKSUMMED}-Please sign this message to secure your vote. This is unrelated from your main Ethereum account and will not be able to send any transactions.`,
    );
    expect(STORAGE_KEYS.derivedKey(ACCOUNT)).toBe(
      `${CHECKSUMMED}-To keep your data safe and to use certain features of Kleros, we ask that you sign these messages to create a secret key for your account. This key is unrelated from your main Ethereum account and will not be able to send any transactions.`,
    );
  });

  it("builds today's committed-vote and draft keys: EIP-55 account, decimal dispute id, no round", () => {
    expect(STORAGE_KEYS.committedVote(ACCOUNT, 156n)).toBe(`@kleros/court/${CHECKSUMMED}/156/vote`);
    expect(STORAGE_KEYS.justificationDraft(100, ACCOUNT, 156n)).toBe(
      `@kleros/court/100/${CHECKSUMMED}/156/justification-draft`,
    );
  });

  it("puts the account in lowercase in the wallet-warning and notification keys, whatever case it is given in", () => {
    expect(STORAGE_KEYS.smartContractWalletWarning(CHECKSUMMED)).toBe(
      `@kleros/court/alert/smart-contract-wallet-warning:${ACCOUNT}`,
    );
    expect(STORAGE_KEYS.notificationsRead(1, CHECKSUMMED)).toBe(`@kleros/court/notifications/read/v1/1/${ACCOUNT}`);
  });

  it("keeps today's fixed keys and the watch-asset key with the token address as configured", () => {
    expect(STORAGE_KEYS.atlasToken).toBe("atlas_auth_token");
    expect(STORAGE_KEYS.atlasAccount).toBe("atlas_auth_account");
    expect(STORAGE_KEYS.theme).toBe("@kleros/court/theme");
    expect(STORAGE_KEYS.fallbackChainId).toBe("@@kleros/court/fallback-chain-id");
    expect(STORAGE_KEYS.viewOnlyReload).toBe("@@kleros/court/view-only-reload");
    expect(STORAGE_KEYS.restoredFromBackForwardCache).toBe("@@kleros/court/restored-from-back-forward-cache");
    expect(STORAGE_KEYS.watchAssetAsked("stPNK", 100, "0xAbC")).toBe("@@kleros/court/tokens/stPNK/100/0xAbC");
  });

  it("puts cache entries under the versioned cache prefix", () => {
    expect(STORAGE_KEYS.cacheEntry("case-file", "1/1684")).toBe("@kleros/court/cache/v1/case-file/1/1684");
  });
});

describe("NEVER_READ_PREFIXES", () => {
  it("lists the old app's caches, its dropped banner flag and its wallet choice", () => {
    expect(NEVER_READ_PREFIXES).toEqual([
      "@@kleros/court/metaevidence/v1/",
      "@@kleros/court/metaevidence/v2/",
      "@@kleros/court/reality-question/v1/",
      "@@kleros/court/executed-ruling/v1/",
      "@@kleros/court/claim-snapshots/v1/",
      "@kleros/court/alert/xdai-court",
      "@kleros/court-v1/last-wallet-connected",
    ]);
  });

  it("covers keys the old app builds under those prefixes and none of the keys this app uses", () => {
    for (const old of [
      "@@kleros/court/metaevidence/v2/1/0x988b3a538b618c7a603e1c11ab82cd16dbe28069/1684",
      "@@kleros/court/reality-question/v1/100/0xabc/1",
      "@@kleros/court/executed-ruling/v1/1/0xabc/1",
      "@@kleros/court/claim-snapshots/v1/1/0xabc",
      "@kleros/court/alert/xdai-court",
      "@kleros/court-v1/last-wallet-connected",
    ]) {
      expect(isNeverRead(old)).toBe(true);
    }
    for (const live of [
      STORAGE_KEYS.salt(ACCOUNT),
      STORAGE_KEYS.committedVote(ACCOUNT, 1n),
      STORAGE_KEYS.smartContractWalletWarning(ACCOUNT),
      STORAGE_KEYS.watchAssetAsked("PNK", 100, "0xabc"),
      STORAGE_KEYS.fallbackChainId,
      STORAGE_KEYS.viewOnlyReload,
      STORAGE_KEYS.restoredFromBackForwardCache,
      STORAGE_KEYS.cacheEntry("reality-locator", "1/1"),
    ]) {
      expect(isNeverRead(live)).toBe(false);
    }
  });
});
