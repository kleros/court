#!/usr/bin/env node
/**
 * Copies src/assets/snapshots.json — the single source of truth for the monthly reward
 * snapshot CIDs — to public/snapshots.json, so that:
 *
 * 1. the standalone staking-rewards.html page can read it same-origin (files under
 *    public/ are copied verbatim by the build and cannot import from src/), and
 * 2. klerosboard and proof-of-humanity-v2-web can fetch it cross-origin from
 *    https://court.kleros.io/snapshots.json (see the CORS header in netlify.toml).
 *
 * src/components/claim-modal.js and src/helpers/rewards.js import the manifest directly.
 *
 * The array index of each snapshot is the on-chain `week` argument to
 * MerkleRedeem.claimWeek, so order and length must never change.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const source = path.join(root, "src", "assets", "snapshots.json");
const destination = path.join(root, "public", "snapshots.json");

const CHAIN_IDS = ["1", "100"];

const snapshots = JSON.parse(fs.readFileSync(source, "utf8"));
for (const chainId of CHAIN_IDS) {
  if (!Array.isArray(snapshots[chainId]) || snapshots[chainId].length === 0) {
    throw new Error(`snapshots.json is missing snapshots for chain ${chainId}`);
  }
}

fs.writeFileSync(destination, JSON.stringify(snapshots) + "\n");
