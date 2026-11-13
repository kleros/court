//Resolves an account's claim entries from the monthly reward snapshots.
//Snapshot files are immutable, so can be cached indefinitely and keyed by CID.
//Claim STATUS is deliberately never cached as it must always be read live from the MerkleRedeem contract.

const CACHE_PREFIX = "@@kleros/court/claim-snapshots/v1";

export const SNAPSHOT_FETCH_TIMEOUT_MS = 30000;

//A request that hangs forever would stall and keep the Claim button pending for the whole session.
//A timeout resolves to 0 and is excluded from this session's totals, never cached, and retried on the next load.
const fetchTreeWithTimeout = async (fetchFn, url, timeoutMs) => {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : undefined;
  let timer;
  const timedOut = new Promise((_, reject) => {
    timer = setTimeout(() => {
      if (controller) controller.abort();
      reject(new Error(`Timed out fetching ${url} after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const fetched = (async () => {
      const response = await fetchFn(url, controller ? { signal: controller.signal } : undefined);
      return response.json();
    })();
    return await Promise.race([fetched, timedOut]);
  } finally {
    clearTimeout(timer);
  }
};

const cacheKey = (chainId, account) => `${CACHE_PREFIX}/${chainId}/${String(account).toLowerCase()}`;

export const hasUnverifiedWeeks = (claims) => Array.isArray(claims) && claims.some((claim) => claim === 0);

export const readCachedClaims = (storage, chainId, account) => {
  try {
    const raw = storage.getItem(cacheKey(chainId, account));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {
    //Unreadable cache is treated as empty; it gets overwritten on the next successful load.
  }
  return {};
};

export const writeCachedClaims = (storage, chainId, account, claimsByCid) => {
  try {
    storage.setItem(cacheKey(chainId, account), JSON.stringify(claimsByCid));
  } catch {
    //Caching is best-effort.
  }
};

//Resolves the account's claim entry for every snapshot, index-aligned with `snapshots`.
//Only snapshots missing from the cache are fetched, at most `concurrency` at a time.
//The array index is also the on-chain `week` argument of MerkleRedeem.claimWeeks, meaning the output must keep one slot per snapshot.
//The logic is the following:
//   - the real merkle claim entry ({ value, proof }) when the account is in that snapshot;
//   - undefined when the account is not in the snapshot;
//   - 0 when the snapshot could not be fetched (keep out of the cache so it is retried on the next load).
export async function loadClaims({
  account,
  chainId,
  snapshots,
  gateway,
  storage,
  concurrency = 6,
  fetchFn = fetch,
  timeoutMs = SNAPSHOT_FETCH_TIMEOUT_MS,
}) {
  const cached = readCachedClaims(storage, chainId, account);
  const claimsByWeek = new Array(snapshots.length);
  const missing = [];

  snapshots.forEach((cid, week) => {
    //null marks "account not in this snapshot".
    if (cid in cached) claimsByWeek[week] = cached[cid] === null ? undefined : cached[cid];
    else missing.push({ cid, week });
  });

  let cursor = 0;
  let dirty = false;
  const worker = async () => {
    while (cursor < missing.length) {
      const { cid, week } = missing[cursor++];
      try {
        const tree = await fetchTreeWithTimeout(fetchFn, `${gateway}/ipfs/${cid}`, timeoutMs);
        const entry = tree.merkleTree.claims[account];
        claimsByWeek[week] = entry;
        cached[cid] = entry === undefined ? null : entry;
        dirty = true;
      } catch (err) {
        console.error(err);
        claimsByWeek[week] = 0;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, missing.length) }, worker));

  if (dirty) writeCachedClaims(storage, chainId, account, cached);
  return claimsByWeek;
}
