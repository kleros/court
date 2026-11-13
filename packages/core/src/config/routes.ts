import { COURT_CHAIN_ID_LIST, type CourtChainId } from "../chains.ts";

/** Plain decimal: digits 0-9 only, no sign, spaces, exponent or leading zero. */
const CANONICAL_DECIMAL = /^(?:0|[1-9][0-9]*)$/;
/** The largest uint256 has 78 digits; a longer segment is refused before any number is built from it. */
const MAX_DISPUTE_ID_DIGITS = 78;
const UINT256_LIMIT = 2n ** 256n;

/** The chain prefix of a page address: a court chain, written exactly as its decimal id (testnets included). */
export function parseRouteChainId(segment: unknown): CourtChainId | null {
  return COURT_CHAIN_ID_LIST.find((id) => String(id) === segment) ?? null;
}

/** A case page's dispute id: canonical decimal only, so one dispute has exactly one address. Anything else = not found. */
export function parseDisputeId(segment: unknown): bigint | null {
  if (typeof segment !== "string" || segment.length > MAX_DISPUTE_ID_DIGITS || !CANONICAL_DECIMAL.test(segment)) {
    return null;
  }
  const id = BigInt(segment);
  return id < UINT256_LIMIT ? id : null;
}
