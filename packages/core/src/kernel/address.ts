import { getAddress } from "viem";
import type { Address } from "./types.ts";

const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/**
 * Lowercase, 0x + 40 hex. Any case is accepted and the EIP-55 checksum is not checked: the 20 bytes are the same either
 * way, and core compares addresses in lowercase only.
 */
export function toAddress(value: unknown): Address | null {
  return typeof value === "string" && HEX_ADDRESS.test(value) ? (value.toLowerCase() as Address) : null;
}

/** EIP-55 form, for display, the frozen salt key and script/display parameters only. */
export function toChecksum(address: Address): string {
  return getAddress(address);
}
