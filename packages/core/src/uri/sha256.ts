import { bytesToHex } from "viem";
import type { Hex } from "../kernel/index.ts";

/**
 * SHA-256 of the bytes (WebCrypto) as 0x + 64 lowercase hex: the pin of a script or display file (D-18). The copy gives
 * WebCrypto a view of a plain ArrayBuffer holding exactly these bytes, which it requires (no shared buffers).
 */
export async function sha256Hex(bytes: Uint8Array): Promise<Hex> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return bytesToHex(new Uint8Array(digest));
}
