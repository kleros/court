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
 *                                                         base manifest (what CI does on PRs)
 *   node scripts/verify-snapshot-roots.js                 verify every entry (manual audit)
 *   --strict                                              fail on not-yet-seeded weeks too
 *
 * A week that is not seeded yet reads as the zero root on-chain. The monthly rewards runbook
 * opens the court PR before the owner runs seedAllocations, so that state is reported as
 * "pending" and does not fail the check unless --strict is passed. A non-zero root that differs
 * from the file always fails.
 */
// CLI script; the console output is its interface.
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

// The RPC endpoints come from the committed .env, through the same variables the app itself uses
// (see chainIdToRpcEndpoint in src/bootstrap/web3.js). Real environment variables take precedence,
// so CI or a caller can point elsewhere without touching the file.
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

function rpcUrl(rpcEnvVar) {
  const url = env(rpcEnvVar);
  if (!url) throw new Error(`no RPC url: set ${rpcEnvVar} (in the environment or .env)`);
  return url;
}

// The MerkleRedeem deployments. The addresses are immutable deployed contracts, kept in sync with
// chainIdToParams in src/components/claim-modal.js (the mainnet one also matches
// @kleros/pnk-merkle-drop-contracts/deployments/mainnet/MerkleRedeem.json).
const CHAINS = {
  1: {
    label: "mainnet",
    merkleRedeem: "0xdbc3088Dfebc3cc6A84B0271DaDe2696DB00Af38",
    rpcEnvVar: "REACT_APP_WEB3_FALLBACK_HTTPS_URL",
  },
  100: {
    label: "gnosis",
    merkleRedeem: "0xf1A9589880DbF393F32A5b2d5a0054Fa10385074",
    rpcEnvVar: "REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL",
  },
};
// Mirrors IPFS_GATEWAY in src/utils/ipfs.js (an ES module a node script cannot require).
const IPFS_GATEWAY = env("IPFS_GATEWAY") || "https://cdn.kleros.link";
const WEEK_MERKLE_ROOTS_SELECTOR = "0xdd8c9c9d"; // keccak256("weekMerkleRoots(uint256)")[0..4]
const ZERO_ROOT = `0x${"0".repeat(64)}`;
const ROOT_SHAPE = /^0x[0-9a-fA-F]{64}$/;

async function fetchWithFallback(urls, describe, init) {
  const failures = [];
  for (const url of urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000), ...init });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
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

async function fetchOnChainRoot(chainId, week) {
  const data = WEEK_MERKLE_ROOTS_SELECTOR + week.toString(16).padStart(64, "0");
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "eth_call",
    params: [{ to: CHAINS[chainId].merkleRedeem, data }, "latest"],
  });
  const rpcResponse = await fetchWithFallback(
    [rpcUrl(CHAINS[chainId].rpcEnvVar)],
    `weekMerkleRoots(${week}) on ${chainId}`,
    { method: "POST", headers: { "content-type": "application/json" }, body }
  );
  if (rpcResponse.error || !ROOT_SHAPE.test(rpcResponse.result || "")) {
    throw new Error(
      `bad RPC response for week ${week} on chain ${chainId}: ${JSON.stringify(rpcResponse).slice(0, 200)}`
    );
  }
  return rpcResponse.result.toLowerCase();
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
  for (const { chainId, week, entry, changed } of work) {
    const where = `${CHAINS[chainId].label} week ${week} (${entry})${changed ? " [existing entry CHANGED]" : ""}`;
    try {
      const [fileRoot, onChainRoot] = await Promise.all([fetchSnapshotRoot(entry), fetchOnChainRoot(chainId, week)]);
      if (onChainRoot === ZERO_ROOT) {
        pending += 1;
        console.log(`PENDING  ${where}\n         not seeded on-chain yet; re-run after seedAllocations to confirm.`);
        if (strict) failed += 1;
      } else if (onChainRoot === fileRoot) {
        console.log(`OK       ${where}`);
      } else {
        failed += 1;
        console.error(`MISMATCH ${where}\n         file:     ${fileRoot}\n         on-chain: ${onChainRoot}`);
      }
    } catch (error) {
      failed += 1;
      console.error(`ERROR    ${where}\n         ${error.message}`);
    }
  }

  console.log(
    `\nverified ${work.length} entr${work.length === 1 ? "y" : "ies"}: ${failed} failed, ${pending} pending.`
  );
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
