#!/usr/bin/env node
/**
 * Validates src/assets/snapshots.json — the source of truth for the monthly reward snapshot CIDs —
 * and copies it to public/snapshots.json, which the build publishes at court.kleros.io/snapshots.json.
 *
 * That published manifest is read same-origin by the standalone staking-rewards.html page and, cross-
 * origin, by klerosboard and proof-of-humanity-v2-web. src/components/claim-modal.js and
 * src/helpers/rewards.js import snapshots.json directly.
 *
 * The array index of each snapshot is the on-chain `week` argument to MerkleRedeem.claimWeek,
 * so order and length must never change.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const source = path.join(root, "src", "assets", "snapshots.json");
const destination = path.join(root, "public", "snapshots.json");

// Every chain the reward snapshots cover, declared once. To support a new chain, add one entry
// here (with its filename prefix); CHAIN_IDS and the prefix lookup derive from it, so the set of
// chains and their prefixes can never drift apart.
const CHAINS = {
  1: { filenamePrefix: "snapshot-" },
  100: { filenamePrefix: "xdai-snapshot-" },
};
const CHAIN_IDS = Object.keys(CHAINS);
const ENTRY = /^[A-Za-z0-9]+\/[A-Za-z0-9._-]+\.json$/;

// rewards.js derives the IPFS url, the month and the chain from these strings alone, so a
// malformed entry there is a wrong reward figure at runtime rather than an error.
function assertEntriesAreWellFormed(entries, chainId) {
  for (const entry of entries) {
    if (!ENTRY.test(entry)) {
      throw new Error(`snapshots.json: chain ${chainId} entry "${entry}" is not of the form "<cid>/<filename>.json"`);
    }
    const filename = entry.split("/")[1];
    const { filenamePrefix } = CHAINS[chainId];
    if (!filename.startsWith(filenamePrefix)) {
      throw new Error(
        `snapshots.json: chain ${chainId} entry "${entry}" must start with "${filenamePrefix}" ` +
          `— rewards.js tells the chains apart by that prefix.`
      );
    }
  }
}

// A month published for one chain but not the other would make getSnapshotRewardAndSupply()
// sum an incomplete reward set. Snapshots are appended, so only the newest month can be partial.
function assertNewestMonthIsOnEveryChain(snapshots) {
  const newestMonth = (chainId) => {
    const entries = snapshots[chainId];
    const newest = entries[entries.length - 1];
    const month = (newest.match(/(\d{4}-\d{2})/) || [])[1];
    if (!month) {
      throw new Error(
        `snapshots.json: chain ${chainId}'s newest entry "${newest}" has no YYYY-MM, ` +
          `so it can't be checked against the other chains.`
      );
    }
    return month;
  };
  const [referenceChain, ...otherChains] = CHAIN_IDS;
  const referenceMonth = newestMonth(referenceChain);
  for (const chainId of otherChains) {
    const month = newestMonth(chainId);
    if (month !== referenceMonth) {
      throw new Error(
        `snapshots.json: newest month differs per chain ` +
          `(chain ${referenceChain} ${referenceMonth}, chain ${chainId} ${month}). ` +
          `Add the missing month, or the monthly reward total will be missing a chain.`
      );
    }
  }
}

const snapshots = JSON.parse(fs.readFileSync(source, "utf8"));

// Everything below is verified per chain in CHAIN_IDS, but the whole object is written out. Reject
// any other chain so nothing reaches public/snapshots.json without being validated first.
const unverifiedChains = Object.keys(snapshots).filter((chainId) => !CHAIN_IDS.includes(chainId));
if (unverifiedChains.length > 0) {
  throw new Error(
    `snapshots.json: chain(s) ${unverifiedChains.join(", ")} are not verified. Add them to CHAINS ` +
      `so they are validated before being published.`
  );
}

for (const chainId of CHAIN_IDS) {
  if (!Array.isArray(snapshots[chainId]) || snapshots[chainId].length === 0) {
    throw new Error(`snapshots.json is missing snapshots for chain ${chainId}`);
  }
  assertEntriesAreWellFormed(snapshots[chainId], chainId);
}
assertNewestMonthIsOnEveryChain(snapshots);

fs.writeFileSync(destination, JSON.stringify(snapshots) + "\n");
