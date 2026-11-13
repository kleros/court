import type { Features } from "@reown/appkit/react";
import { COURT_CHAIN_ID_LIST, type CourtEnv } from "@court/core";

/**
 * AppKit features, all off except plain wallet connection (D-01). `socials` is an empty
 * array (the adapter registers the embedded-wallet connector only for a non-empty array or email on). The Reown
 * dashboard can override these remotely, so the same features must be off there too (kyrers, phase 0-1).
 */
export const APPKIT_FEATURES: Readonly<Features> = {
  analytics: false,
  email: false,
  socials: [],
  swaps: false,
  onramp: false,
  send: false,
  history: false,
};

/** No Reown web font (fonts.reown.com); system fonts until the design rounds pick the app's own. */
export const APPKIT_THEME_VARIABLES = {
  "--w3m-font-family": "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
} as const;

/** Our RPC URLs first in AppKit's networks, so its own calls prefer them (wagmi's chains lead with public ones). */
export function customRpcUrls(env: CourtEnv): Record<`eip155:${string}`, { url: string }[]> {
  const out: Record<`eip155:${string}`, { url: string }[]> = {};
  for (const id of COURT_CHAIN_ID_LIST) {
    const url = env.rpcUrls[id];
    if (url !== undefined) out[`eip155:${String(id)}`] = [{ url }];
  }
  return out;
}

export function appMetadata(origin: string) {
  return {
    name: "Kleros Court",
    description: "Kleros Court",
    url: origin,
    icons: [`${origin}/icon-192.png`],
  };
}
