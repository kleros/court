import { hasUnverifiedWeeks, loadClaims, readCachedClaims, writeCachedClaims } from "./claim-snapshots";

const CHAIN_ID = 100;
const ACCOUNT = "0xAd9F95327af33804D2265a4cC37a4FF867C56954";
const GATEWAY = "https://cdn.kleros.test";

const CLAIM_A = { value: { hex: "0x0de0b6b3a7640000" }, proof: ["0xaa", "0xbb"] };
const CLAIM_C = { value: { hex: "0x1bc16d674ec80000" }, proof: ["0xcc"] };

const makeStorage = () => {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    map,
  };
};

const makeTree = (claims) => ({ merkleTree: { claims } });

//fetchFn resolving each CID to a fixture tree; rejects for CIDs in `failing`.
const makeFetchFn = (treesByCid, failing = []) =>
  jest.fn((url) => {
    const cid = url.replace(`${GATEWAY}/ipfs/`, "");
    if (failing.includes(cid)) return Promise.reject(new Error(`fetch failed for ${cid}`));
    return Promise.resolve({ json: () => Promise.resolve(treesByCid[cid]) });
  });

const load = (overrides = {}) =>
  loadClaims({
    account: ACCOUNT,
    chainId: CHAIN_ID,
    snapshots: ["cidA", "cidB", "cidC"],
    gateway: GATEWAY,
    storage: overrides.storage ?? makeStorage(),
    fetchFn: overrides.fetchFn,
    ...overrides,
  });

describe("loadClaims", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  const treesByCid = {
    cidA: makeTree({ [ACCOUNT]: CLAIM_A }),
    cidB: makeTree({}),
    cidC: makeTree({ [ACCOUNT]: CLAIM_C }),
  };

  it("keeps one slot per snapshot, in snapshot order (week-index invariant)", async () => {
    const claims = await load({ fetchFn: makeFetchFn(treesByCid) });

    expect(claims).toHaveLength(3);
    expect(claims[0]).toEqual(CLAIM_A);
    expect(claims[1]).toBeUndefined();
    expect(claims[2]).toEqual(CLAIM_C);
  });

  it("serves every snapshot from cache on the second load, with zero fetches", async () => {
    const storage = makeStorage();
    const fetchFn = makeFetchFn(treesByCid);

    const first = await load({ storage, fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(3);

    const secondFetchFn = makeFetchFn(treesByCid);
    const second = await load({ storage, fetchFn: secondFetchFn });
    expect(secondFetchFn).not.toHaveBeenCalled();
    expect(second).toEqual(first);
  });

  it("only fetches snapshots missing from the cache (new month appended)", async () => {
    const storage = makeStorage();
    await load({ storage, fetchFn: makeFetchFn(treesByCid) });

    const treesWithNewMonth = { ...treesByCid, cidD: makeTree({ [ACCOUNT]: CLAIM_A }) };
    const fetchFn = makeFetchFn(treesWithNewMonth);
    const claims = await load({ storage, fetchFn, snapshots: ["cidA", "cidB", "cidC", "cidD"] });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(`${GATEWAY}/ipfs/cidD`, expect.anything());
    expect(claims).toHaveLength(4);
    expect(claims[3]).toEqual(CLAIM_A);
  });

  it("marks failed fetches as 0 in place, does not cache them, and retries next load", async () => {
    const storage = makeStorage();
    const claims = await load({ storage, fetchFn: makeFetchFn(treesByCid, ["cidB"]) });

    expect(claims).toEqual([CLAIM_A, 0, CLAIM_C]);

    const retryFetchFn = makeFetchFn(treesByCid);
    const retried = await load({ storage, fetchFn: retryFetchFn });
    expect(retryFetchFn).toHaveBeenCalledTimes(1);
    expect(retryFetchFn).toHaveBeenCalledWith(`${GATEWAY}/ipfs/cidB`, expect.anything());
    expect(retried).toEqual([CLAIM_A, undefined, CLAIM_C]);
  });

  it("treats a malformed snapshot as a failed fetch for that week only", async () => {
    const claims = await load({
      fetchFn: makeFetchFn({ ...treesByCid, cidB: { notATree: true } }),
    });

    expect(claims).toEqual([CLAIM_A, 0, CLAIM_C]);
  });

  it("times out a hung fetch, marks that week 0, and retries it next load", async () => {
    const storage = makeStorage();
    const hangingFetchFn = jest.fn((url) => {
      if (url.endsWith("cidB")) return new Promise(() => {});
      return makeFetchFn(treesByCid)(url);
    });

    const claims = await load({ storage, fetchFn: hangingFetchFn, timeoutMs: 25 });
    expect(claims).toEqual([CLAIM_A, 0, CLAIM_C]);

    const retryFetchFn = makeFetchFn(treesByCid);
    const retried = await load({ storage, fetchFn: retryFetchFn });
    expect(retryFetchFn).toHaveBeenCalledTimes(1);
    expect(retried).toEqual([CLAIM_A, undefined, CLAIM_C]);
  });

  it("returns an empty array for an empty snapshot list without fetching or caching", async () => {
    const storage = makeStorage();
    const fetchFn = jest.fn();

    const claims = await load({ storage, fetchFn, snapshots: [] });
    expect(claims).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(storage.map.size).toBe(0);
  });

  it("never runs more than `concurrency` fetches at once", async () => {
    const snapshots = Array.from({ length: 20 }, (_, i) => `cid${i}`);
    let active = 0;
    let maxActive = 0;
    const fetchFn = jest.fn(
      () =>
        new Promise((resolve) => {
          active++;
          maxActive = Math.max(maxActive, active);
          setTimeout(() => {
            active--;
            resolve({ json: () => Promise.resolve(makeTree({})) });
          }, 0);
        })
    );

    await load({ snapshots, fetchFn, concurrency: 4 });

    expect(fetchFn).toHaveBeenCalledTimes(20);
    expect(maxActive).toBeLessThanOrEqual(4);
  });

  it("keeps separate caches per account and per chain", async () => {
    const storage = makeStorage();
    await load({ storage, fetchFn: makeFetchFn(treesByCid) });

    const otherAccountFetchFn = makeFetchFn(treesByCid);
    await load({ storage, fetchFn: otherAccountFetchFn, account: "0x0000000000000000000000000000000000000001" });
    expect(otherAccountFetchFn).toHaveBeenCalledTimes(3);

    const otherChainFetchFn = makeFetchFn(treesByCid);
    await load({ storage, fetchFn: otherChainFetchFn, chainId: 1 });
    expect(otherChainFetchFn).toHaveBeenCalledTimes(3);
  });

  it("survives a corrupt cache entry by refetching everything", async () => {
    const storage = makeStorage();
    writeCachedClaims(storage, CHAIN_ID, ACCOUNT, "not-an-object");

    const fetchFn = makeFetchFn(treesByCid);
    const claims = await load({ storage, fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(claims[0]).toEqual(CLAIM_A);
  });
});

describe("hasUnverifiedWeeks", () => {
  it("flags only arrays containing a failed (0) week", () => {
    expect(hasUnverifiedWeeks([CLAIM_A, 0, undefined])).toBe(true);
    expect(hasUnverifiedWeeks([CLAIM_A, undefined])).toBe(false);
    expect(hasUnverifiedWeeks([])).toBe(false);
    expect(hasUnverifiedWeeks(0)).toBe(false); //initial component state before any load
  });
});

describe("cache read/write", () => {
  it("round-trips claims and tolerates unavailable storage", () => {
    const storage = makeStorage();
    writeCachedClaims(storage, CHAIN_ID, ACCOUNT, { cidA: CLAIM_A, cidB: null });
    expect(readCachedClaims(storage, CHAIN_ID, ACCOUNT)).toEqual({ cidA: CLAIM_A, cidB: null });

    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(readCachedClaims(broken, CHAIN_ID, ACCOUNT)).toEqual({});
    expect(() => writeCachedClaims(broken, CHAIN_ID, ACCOUNT, {})).not.toThrow();
  });
});
