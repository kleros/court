#!/usr/bin/env node
/**
 * Verifies that snapshot entries in src/assets/snapshots.json carry the same merkle root that is
 * seeded on-chain in that chain's MerkleRedeem contract. The array index of an entry is the
 * on-chain `week`, so for every entry checked:
 *
 *   IPFS <cid>/<filename>.json .merkleTree.root  ===  MerkleRedeem.weekMerkleRoots(index)
 *
 * This catches what format checks can't: an entry whose CID is well-formed but points at the
 * wrong (or tampered) snapshot, or an entry sitting at the wrong index. Funds are safe either
 * way — the contract verifies every claim proof against the on-chain root — so this is an
 * integrity gate that catches a bad manifest at PR time instead of when a juror's claim fails.
 *
 * Usage:
 *   node scripts/verify-snapshot-roots.js --base <path>   verify entries added or changed vs the
 *                                                         base manifest (CI adds --strict on PRs)
 *   node scripts/verify-snapshot-roots.js                 verify every entry (manual audit)
 *   --strict                                              fail on not-yet-seeded weeks too
 *
 * Needs node >= 18 for global fetch, but package.json pins 16 through volta, so locally run it as
 *   volta run --node 22 node scripts/verify-snapshot-roots.js
 *
 * A week that is not seeded yet reads as the zero root on-chain, and is reported as "pending"
 * rather than failing unless --strict is passed. The rewards runbook seeds both chains before
 * opening the court PR, so a pending week means the PR was opened too early — often in the gap
 * where mainnet is seeded but gnosis is not. Seed it, then re-run. A non-zero root that differs
 * from the file always fails.
 */
// CLI script; the console output is its interface.
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

// package.json pins node 16 through volta, which predates global fetch (node 18). Without this
// guard every entry fails with "fetch is not defined", which reads as a manifest full of bad
// snapshots rather than as the wrong node version.
if (typeof fetch !== "function") {
  console.error(
    `This script needs node >= 18; running ${process.version}.\n` +
      `Run it as: volta run --node 22 node scripts/verify-snapshot-roots.js`
  );
  process.exit(1);
}

const root = path.join(__dirname, "..");

// An RPC endpoint set through the environment or a local .env wins, through the same variables the
// app itself uses (see chainIdToRpcEndpoint in src/bootstrap/web3.js). Without one — CI and fork
// PRs, where .env is untracked and secrets are unavailable — the public endpoints in CHAINS serve.
function readDotEnv() {
  const values = {};
  const dotEnvPath = path.join(root, ".env");
  if (!fs.existsSync(dotEnvPath)) return values;
  for (const line of fs.readFileSync(dotEnvPath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=("([^"]*)"|'([^']*)'|[^#]*)/);
    if (match) values[match[1]] = (match[3] ?? match[4] ?? match[2]).trim();
  }
  return values;
}
const dotEnv = readDotEnv();
const env = (name) => process.env[name] || dotEnv[name];

function rpcUrls(chain) {
  const override = env(chain.rpcEnvVar);
  // The override is tried first but never replaces the public endpoints: it is the app's browser
  // key, which can be origin-restricted and then rejects a node script, failing the run outright
  // for anyone who has a .env.
  return override ? [override, ...chain.publicRpcUrls] : chain.publicRpcUrls;
}

// The MerkleRedeem deployments. The addresses are immutable deployed contracts, kept in sync with
// chainIdToParams in src/components/claim-modal.js (the mainnet one also matches
// @kleros/pnk-merkle-drop-contracts/deployments/mainnet/MerkleRedeem.json).
const CHAINS = {
  1: {
    label: "mainnet",
    merkleRedeem: "0xdbc3088Dfebc3cc6A84B0271DaDe2696DB00Af38",
    rpcEnvVar: "REACT_APP_WEB3_FALLBACK_HTTPS_URL",
    publicRpcUrls: ["https://ethereum-rpc.publicnode.com", "https://eth.drpc.org"],
  },
  100: {
    label: "gnosis",
    merkleRedeem: "0xf1A9589880DbF393F32A5b2d5a0054Fa10385074",
    rpcEnvVar: "REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL",
    publicRpcUrls: ["https://rpc.gnosischain.com", "https://gnosis-rpc.publicnode.com"],
  },
};
// Mirrors IPFS_GATEWAY in src/utils/ipfs.js (an ES module a node script cannot require).
const IPFS_GATEWAY = env("IPFS_GATEWAY") || "https://cdn.kleros.link";
const WEEK_MERKLE_ROOTS_SELECTOR = "0xdd8c9c9d"; // keccak256("weekMerkleRoots(uint256)")[0..4]
const ZERO_ROOT = `0x${"0".repeat(64)}`;
const ROOT_SHAPE = /^0x[0-9a-fA-F]{64}$/;

// `validate` rejects a payload by throwing, which retires that endpoint exactly like a transport
// error does. An RPC key that is origin-restricted may answer 200 with a JSON-RPC error rather
// than a 4xx, and without this that answer would fail the run instead of falling through to the
// public endpoints.
async function fetchWithFallback(urls, describe, init, validate) {
  const failures = [];
  for (const url of urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000), ...init });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (validate) validate(payload);
      return payload;
    } catch (error) {
      failures.push(`${url}: ${error.message}`);
    }
  }
  throw new Error(`${describe} failed on every endpoint:\n    ${failures.join("\n    ")}`);
}

async function fetchSnapshotRoot(entry) {
  const snapshot = await fetchWithFallback([`${IPFS_GATEWAY}/ipfs/${entry}`], `fetching ${entry}`);
  const root = snapshot?.merkleTree?.root;
  if (!ROOT_SHAPE.test(root || "")) throw new Error(`${entry} has no valid merkleTree.root (got ${root})`);
  return root.toLowerCase();
}

// One weekMerkleRoots(week) call, tried against `urls` in order. `acceptRoot`, when given, also
// treats a root it rejects as a reason to move on to the next endpoint.
async function callWeekRoot(chainId, week, urls, acceptRoot) {
  const data = WEEK_MERKLE_ROOTS_SELECTOR + week.toString(16).padStart(64, "0");
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "eth_call",
    params: [{ to: CHAINS[chainId].merkleRedeem, data }, "latest"],
  });
  const rpcResponse = await fetchWithFallback(
    urls,
    `weekMerkleRoots(${week}) on ${chainId}`,
    { method: "POST", headers: { "content-type": "application/json" }, body },
    (payload) => {
      if (payload.error || !ROOT_SHAPE.test(payload.result || "")) {
        throw new Error(`bad RPC response: ${JSON.stringify(payload).slice(0, 200)}`);
      }
      if (acceptRoot && !acceptRoot(payload.result.toLowerCase())) throw new Error(`root ${payload.result}`);
    }
  );
  return rpcResponse.result.toLowerCase();
}

async function fetchOnChainRoot(chainId, week) {
  const urls = rpcUrls(CHAINS[chainId]);
  const root = await callWeekRoot(chainId, week, urls);
  if (root !== ZERO_ROOT || urls.length === 1) return root;
  // A zero root means the week is not seeded — or that whichever endpoint answered is behind the
  // seeding transaction. Since a pending week fails the check under --strict, ask the rest of the
  // endpoints before reporting one: a non-zero root from any of them wins. If they all read zero,
  // or none can be reached, the zero stands and the week is genuinely pending.
  return callWeekRoot(chainId, week, urls, (candidate) => candidate !== ZERO_ROOT).catch(() => ZERO_ROOT);
}

// Entries whose index is new or whose content changed relative to the base manifest. Existing
// indices must never change (the index is the on-chain week), so a changed one is verified too —
// against an already-seeded root, which will expose it.
function entriesToVerify(current, base) {
  const work = [];
  const removedChains = Object.keys(base).filter((chainId) => !current[chainId]);
  if (removedChains.length > 0) {
    throw new Error(
      `chain(s) ${removedChains.join(", ")} were removed from snapshots.json; entries must never be removed.`
    );
  }
  for (const chainId of Object.keys(current)) {
    if (!CHAINS[chainId]) throw new Error(`snapshots.json has chain ${chainId}, which this script does not know`);
    const baseEntries = base[chainId] ?? [];
    const currentEntries = current[chainId];
    if (currentEntries.length < baseEntries.length) {
      throw new Error(
        `chain ${chainId}: entries were removed (${baseEntries.length} -> ${currentEntries.length}). ` +
          `Indices are on-chain weeks; entries must only ever be appended.`
      );
    }
    currentEntries.forEach((entry, week) => {
      if (entry !== baseEntries[week]) work.push({ chainId, week, entry, changed: week < baseEntries.length });
    });
  }
  return work;
}

// Verifies one entry against its on-chain root and reports the outcome: "ok", "pending" or "failed".
async function verifyEntry({ chainId, week, entry, changed }) {
  const where = `${CHAINS[chainId].label} week ${week} (${entry})${changed ? " [existing entry CHANGED]" : ""}`;
  try {
    const [fileRoot, onChainRoot] = await Promise.all([fetchSnapshotRoot(entry), fetchOnChainRoot(chainId, week)]);
    if (onChainRoot === ZERO_ROOT) {
      console.log(
        `PENDING  ${where}\n         not seeded on-chain yet — seed it, then re-run this check before merging.`
      );
      return "pending";
    }
    if (onChainRoot === fileRoot) {
      console.log(`OK       ${where}`);
      return "ok";
    }
    console.error(`MISMATCH ${where}\n         file:     ${fileRoot}\n         on-chain: ${onChainRoot}`);
  } catch (error) {
    console.error(`ERROR    ${where}\n         ${error.message}`);
  }
  return "failed";
}

async function main() {
  const args = process.argv.slice(2);
  const strict = args.includes("--strict");
  const baseFlag = args.indexOf("--base");
  const basePath = baseFlag === -1 ? null : args[baseFlag + 1];

  const current = JSON.parse(fs.readFileSync(path.join(root, "src", "assets", "snapshots.json"), "utf8"));
  const base = basePath ? JSON.parse(fs.readFileSync(basePath, "utf8")) : {};

  const work = entriesToVerify(current, base);
  if (work.length === 0) {
    console.log("snapshots.json: no added or changed entries to verify.");
    return;
  }

  let failed = 0;
  let pending = 0;
  for (const item of work) {
    const outcome = await verifyEntry(item);
    if (outcome === "pending") pending += 1;
    if (outcome === "failed") failed += 1;
  }

  console.log(
    `\nverified ${work.length} entr${work.length === 1 ? "y" : "ies"}: ${failed} failed, ${pending} pending.`
  );
  if (strict && pending > 0) console.error(`--strict: pending entries are treated as failures.`);
  if (failed > 0 || (strict && pending > 0)) process.exit(1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
