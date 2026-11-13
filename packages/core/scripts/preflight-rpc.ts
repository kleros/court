/**
 * RPC preflight for the production deploy (D-18): every configured read RPC must accept requests from an opaque origin
 * (`Origin: null`, the dynamic-script frame) and be the chain it is configured for; Mainnet and Gnosis must be
 * configured. One line per chain, then a summary; exit 0 when nothing failed, 1 otherwise.
 *
 * Usage: `node packages/core/scripts/preflight-rpc.ts` (Node's type stripping, no build). Settings come only from the
 * environment Node is given (the Netlify build's variables); this script reads no file. It never prints a URL or any
 * part of one: the URLs carry API keys.
 */
import process from "node:process";
import { readEnv } from "../src/config/index.ts";
import { preflightAll, type PreflightResult } from "../src/rpc/index.ts";

function line(result: PreflightResult): string {
  const chain = `chain ${String(result.chainId)}:`;
  if (result.status === "pass") return `${chain} pass`;
  if (result.status === "not-configured") return `${chain} not configured`;
  return `${chain} FAIL (${result.reason})`;
}

try {
  const results = await preflightAll(readEnv(process.env), fetch);
  for (const result of results) console.log(line(result));
  const failed = results.filter((result) => result.status === "fail").length;
  console.log(failed === 0 ? "RPC preflight passed." : `RPC preflight failed on ${String(failed)} chain(s).`);
  process.exitCode = failed === 0 ? 0 : 1;
} catch (error) {
  // preflightAll never rejects; a crash is named by its type only, since a message could carry a URL.
  console.log(`RPC preflight crashed (${error instanceof Error ? error.name : typeof error}).`);
  process.exitCode = 1;
}
