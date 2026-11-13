import type { Address } from "../kernel/index.ts";

/** MerkleRedeem, the monthly juror reward contract, as the old app claims from it (spec 04.11). */
export const MERKLE_REDEEM = {
  1: "0xdbc3088dfebc3cc6a84b0271dade2696db00af38",
  100: "0xf1a9589880dbf393f32a5b2d5a0054fa10385074",
} as const satisfies Readonly<Record<1 | 100, Address>>;

/** Klerosboard subgraph, read for total staked PNK (the APY), as the old app queries it (spec 04.2). */
export const KLEROSBOARD_URL = {
  1: "https://api.studio.thegraph.com/query/66145/klerosboard-mainnet/version/latest",
  100: "https://api.studio.thegraph.com/query/66145/klerosboard-gnosis/version/latest",
} as const satisfies Readonly<Record<1 | 100, string>>;
