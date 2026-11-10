import { describe, expect, it } from "vitest";
import { toAddress, toChecksum } from "./address.ts";

const LOWER = "0x988b3a538b618c7a603e1c11ab82cd16dbe28069";

describe("toAddress", () => {
  it("accepts 0x + 40 hex in any case and returns it lowercase", () => {
    expect(toAddress(LOWER)).toBe(LOWER);
    expect(toAddress(LOWER.toUpperCase().replace("0X", "0x"))).toBe(LOWER);
    expect(toAddress("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed")).toBe("0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed");
  });

  it("keeps a mixed-case address whose checksum is wrong: the 20 bytes are the same", () => {
    expect(toAddress("0x5AAeb6053F3E94C9b9A09f33669435E7Ef1BeAed")).toBe("0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed");
  });

  it("refuses 39 or 41 hex digits, non-hex, a missing or upper-case prefix, padding and non-strings", () => {
    expect(toAddress(LOWER.slice(0, -1))).toBeNull();
    expect(toAddress(`${LOWER}0`)).toBeNull();
    expect(toAddress(LOWER.replace("a", "g"))).toBeNull();
    expect(toAddress(LOWER.slice(2))).toBeNull();
    expect(toAddress(`0X${LOWER.slice(2)}`)).toBeNull();
    expect(toAddress(` ${LOWER}`)).toBeNull();
    expect(toAddress(`${LOWER}\n`)).toBeNull();
    expect(toAddress(0x988b3a538b618c7a603e1c11ab82cd16dbe28069n)).toBeNull();
    expect(toAddress(null)).toBeNull();
    expect(toAddress(undefined)).toBeNull();
  });
});

describe("toChecksum", () => {
  // The four examples published with EIP-55.
  it.each([
    "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
    "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359",
    "0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB",
    "0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb",
  ])("gives the EIP-55 form %s", (checksummed) => {
    const address = toAddress(checksummed);
    expect(address).not.toBeNull();
    if (address !== null) expect(toChecksum(address)).toBe(checksummed);
  });

  it("throws on a value that is not an address: callers pass toAddress output only", () => {
    expect(() => toChecksum("0x1234")).toThrow();
  });
});
