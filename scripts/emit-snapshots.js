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

const CHAIN_IDS = ["1", "100"];

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
for (const chainId of CHAIN_IDS) {
  if (!Array.isArray(snapshots[chainId]) || snapshots[chainId].length === 0) {
    throw new Error(`snapshots.json is missing snapshots for chain ${chainId}`);
  }
}
assertParity(snapshots);

fs.writeFileSync(destination, JSON.stringify(snapshots) + "\n");
