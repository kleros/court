#!/usr/bin/env node
/**
 * 1. Verifies src/assets/snapshots.json still matches the `snapshots` arrays in
 *    src/components/claim-modal.js, and fails the build if they have drifted.
 * 2. Copies the manifest to public/snapshots.json so the standalone
 *    staking-rewards.html page can read it same-origin (files under public/ are
 *    copied verbatim by the build and cannot import from src/).
 *
 * The arrays in claim-modal.js are duplicated here on purpose, and only
 * temporarily: raw.githubusercontent.com/kleros/court/master/src/components/claim-modal.js
 * is scraped by klerosboard and proof-of-humanity-v2-web to locate the monthly
 * reward snapshots. Once those repos point at snapshots.json instead, delete the
 * arrays from claim-modal.js, have it import this manifest, and drop assertParity().
 *
 * The array index of each snapshot is the on-chain `week` argument to
 * MerkleRedeem.claimWeek, so order and length must never change.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const source = path.join(root, "src", "assets", "snapshots.json");
const claimModal = path.join(root, "src", "components", "claim-modal.js");
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

// Read the `snapshots: [...]` array literal for a chain out of claim-modal.js. This is coupled to
// that file's current indentation; reformatting it will throw here rather than pass silently.
function readClaimModalSnapshots(code, chainId) {
  const block = code.match(new RegExp(`\\n  ${chainId}: \\{[\\s\\S]*?snapshots: \\[([\\s\\S]*?)\\n    \\]`));
  if (!block) throw new Error(`claim-modal.js: could not find the snapshots array for chain ${chainId}`);
  return Array.from(block[1].matchAll(/"([^"]+)"/g), (match) => match[1]);
}

function assertParity(snapshots) {
  const code = fs.readFileSync(claimModal, "utf8");
  for (const chainId of CHAIN_IDS) {
    const expected = readClaimModalSnapshots(code, chainId);
    const actual = snapshots[chainId];
    const drifted = expected.length !== actual.length || expected.some((entry, i) => entry !== actual[i]);
    if (drifted) {
      throw new Error(
        `snapshots.json and claim-modal.js disagree for chain ${chainId} ` +
          `(${actual.length} vs ${expected.length} entries). Update both, keeping the order identical.`
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
      `(and claim-modal.js) so they are validated before being published.`
  );
}

for (const chainId of CHAIN_IDS) {
  if (!Array.isArray(snapshots[chainId]) || snapshots[chainId].length === 0) {
    throw new Error(`snapshots.json is missing snapshots for chain ${chainId}`);
  }
  assertEntriesAreWellFormed(snapshots[chainId], chainId);
}
assertNewestMonthIsOnEveryChain(snapshots);
assertParity(snapshots);

fs.writeFileSync(destination, JSON.stringify(snapshots) + "\n");
