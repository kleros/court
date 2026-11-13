#!/usr/bin/env node
/**
 * Publishes the monthly reward snapshot manifest at /snapshots.json, as today (netlify.toml keeps its CORS header).
 * It is read cross-origin by rewards.kleros.io, klerosboard and proof-of-humanity-v2-web.
 *
 * Source of truth: src/assets/snapshots.json at the repo root, the same path as before the rebuild, because the rewards
 * runbook edits it every month and .github/workflows/verify-snapshot-roots.yml checks it with
 * scripts/verify-snapshot-roots.js. Same checks as legacy/scripts/emit-snapshots.js; the array index of each entry is the
 * on-chain `week` argument to MerkleRedeem.claimWeek, so order and length must never change.
 */
import { readFileSync, writeFileSync } from "node:fs";

const source = new URL("../../../src/assets/snapshots.json", import.meta.url);
const destination = new URL("../public/snapshots.json", import.meta.url);

const CHAINS = {
  1: { filenamePrefix: "snapshot-" },
  100: { filenamePrefix: "xdai-snapshot-" },
};
const CHAIN_IDS = Object.keys(CHAINS);
const ENTRY = /^[A-Za-z0-9]+\/[A-Za-z0-9._-]+\.json$/;

function assertEntriesAreWellFormed(entries, chainId) {
  for (const entry of entries) {
    if (!ENTRY.test(entry)) {
      throw new Error(`snapshots.json: chain ${chainId} entry "${entry}" is not of the form "<cid>/<filename>.json"`);
    }
    const filename = entry.split("/")[1];
    if (!filename.startsWith(CHAINS[chainId].filenamePrefix)) {
      throw new Error(
        `snapshots.json: chain ${chainId} entry "${entry}" must start with "${CHAINS[chainId].filenamePrefix}"`,
      );
    }
  }
}

function assertNewestMonthIsOnEveryChain(snapshots) {
  const newestMonth = (chainId) => {
    const entries = snapshots[chainId];
    const newest = entries[entries.length - 1];
    const month = (newest.match(/(\d{4}-\d{2})/) || [])[1];
    if (!month) throw new Error(`snapshots.json: chain ${chainId}'s newest entry "${newest}" has no YYYY-MM`);
    return month;
  };
  const [referenceChain, ...otherChains] = CHAIN_IDS;
  const referenceMonth = newestMonth(referenceChain);
  for (const chainId of otherChains) {
    const month = newestMonth(chainId);
    if (month !== referenceMonth) {
      throw new Error(
        `snapshots.json: newest month differs per chain (chain ${referenceChain} ${referenceMonth}, chain ${chainId} ${month})`,
      );
    }
  }
}

const snapshots = JSON.parse(readFileSync(source, "utf8"));
const unverifiedChains = Object.keys(snapshots).filter((chainId) => !CHAIN_IDS.includes(chainId));
if (unverifiedChains.length > 0) {
  throw new Error(`snapshots.json: chain(s) ${unverifiedChains.join(", ")} are not verified`);
}
for (const chainId of CHAIN_IDS) {
  if (!Array.isArray(snapshots[chainId]) || snapshots[chainId].length === 0) {
    throw new Error(`snapshots.json is missing snapshots for chain ${chainId}`);
  }
  assertEntriesAreWellFormed(snapshots[chainId], chainId);
}
assertNewestMonthIsOnEveryChain(snapshots);

writeFileSync(destination, JSON.stringify(snapshots) + "\n");
