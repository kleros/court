import { describe, expect, it } from "vitest";
import { sha256Hex } from "./sha256.ts";

const utf8 = (text: string) => new TextEncoder().encode(text);

describe("sha256Hex", () => {
  // FIPS 180-2 appendix B examples, plus the empty input.
  it.each([
    ["", "0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["abc", "0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    [
      "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
      "0x248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    ],
    ["a".repeat(1_000_000), "0xcdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0"],
  ])("hashes %#: the known digest as 0x + 64 lowercase hex", async (text, digest) => {
    expect(await sha256Hex(utf8(text))).toBe(digest);
  });

  it("hashes only the bytes of the view it is given, not the whole buffer behind it", async () => {
    const view = utf8("--abc--").subarray(2, 5);
    expect(view.byteOffset).toBe(2);
    expect(view.buffer.byteLength).toBe(7);
    expect(await sha256Hex(view)).toBe("0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("hashes a view of a SharedArrayBuffer", async () => {
    const shared = new Uint8Array(new SharedArrayBuffer(3));
    shared.set(utf8("abc"));
    expect(await sha256Hex(shared)).toBe("0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("returns a digest that changes with one byte", async () => {
    expect(await sha256Hex(utf8("abd"))).not.toBe(await sha256Hex(utf8("abc")));
  });
});
