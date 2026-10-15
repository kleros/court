import BigNumber from "bignumber.js";
import Web3 from "web3";
import { answerToBytes32, bytes32ToString, getAnswerString, maxNumber, padToBytes32 } from "./reality-answer-format";

// Every expected value below was produced by @reality.eth/reality-eth-lib 3.4.6 (formatters/question), the library these
// functions replace, called with the same arguments; the replacement must match it byte for byte. answerToBytes32 and
// padToBytes32 produce the choice a juror commits to and casts, and getAnswerString renders the votes already on-chain.
// int answers are only decoded (for display): the vote form has no int input, so they are never encoded.

const { toBN } = Web3.utils;
// How answer-string.js turns an on-chain vote into the answer passed to getAnswerString (vote 0 gives a junk string).
const voteToAnswer = (vote) => padToBytes32(toBN(vote).sub(toBN("1")).toString(16));
// How case-details-card.jsx turns an encoded answer into the choice sent on-chain.
const answerToVote = (answer) => padToBytes32(toBN(answer).add(toBN("1")).toString(16));
const INVALID = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const ANSWERED_TOO_SOON = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe";
const MAX_UINT256 = toBN(2).pow(toBN(256)).sub(toBN(1)).toString();
const HASH = "0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

describe("padToBytes32", () => {
  it("left-pads to 32 bytes and prefixes 0x", () => {
    expect(padToBytes32("1")).toBe("0x0000000000000000000000000000000000000000000000000000000000000001");
    expect(padToBytes32(HASH.slice(2))).toBe("0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08");
    expect(padToBytes32("-1")).toBe("0x00000000000000000000000000000000000000000000000000000000000000-1");
  });
});

describe("maxNumber (the upper bound of the uint vote input and the datetime picker)", () => {
  it("divides the uint256 maximum by 10^decimals", () => {
    expect(maxNumber({ decimals: 18, type: "uint" }).toFixed()).toBe(
      "115792089237316195423570985008687907853269984665640564039457.584007913129639935"
    );
    expect(maxNumber({ decimals: 0, type: "uint" }).toFixed()).toBe(
      "115792089237316195423570985008687907853269984665640564039457584007913129639935"
    );
    expect(maxNumber({ type: "uint" }).toFixed()).toBe(
      "115792089237316195423570985008687907853269984665640564039457584007913129639935"
    );
    expect(maxNumber({ type: "datetime" }).toFixed()).toBe(
      "115792089237316195423570985008687907853269984665640564039457584007913129639935"
    );
  });
});

describe("answerToBytes32 (encoding the juror's input before it is committed or cast)", () => {
  it("scales a uint by 10^decimals", () => {
    expect(answerToBytes32("0", { decimals: 18, type: "uint" })).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    expect(answerToBytes32("1", { decimals: 18, type: "uint" })).toBe(
      "0x0000000000000000000000000000000000000000000000000de0b6b3a7640000"
    );
    expect(answerToBytes32("1.5", { decimals: 18, type: "uint" })).toBe(
      "0x00000000000000000000000000000000000000000000000014d1120d7b160000"
    );
    expect(answerToBytes32("0.000000000000000001", { decimals: 18, type: "uint" })).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000001"
    );
    expect(answerToBytes32("123456789.123456789012345678", { decimals: 18, type: "uint" })).toBe(
      "0x000000000000000000000000000000000000000000661efdf2e3b19f7564f34e"
    );
  });
  it("reads the raw input of a uint with 0 or no decimals as hex, like the library did", () => {
    expect(answerToBytes32("10", { decimals: 0, type: "uint" })).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000010"
    );
    expect(answerToBytes32("10", { decimals: undefined, type: "uint" })).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000010"
    );
  });
  it("encodes a datetime as its unix timestamp", () => {
    expect(answerToBytes32(1704067200, { decimals: undefined, type: "datetime" })).toBe(
      "0x0000000000000000000000000000000000000000000000000000000065920080"
    );
  });
  it("pads a hash", () => {
    expect(answerToBytes32(HASH, { decimals: undefined, type: "hash" })).toBe(
      "0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
    );
    expect(answerToBytes32("0x1", { decimals: undefined, type: "hash" })).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000001"
    );
  });
  it("encodes a multiple-select as a bitmask, option i being bit i", () => {
    expect(answerToBytes32([false, false, false], { decimals: undefined, type: "multiple-select" })).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    expect(answerToBytes32([true, false, false], { decimals: undefined, type: "multiple-select" })).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000001"
    );
    expect(answerToBytes32([false, true, false], { decimals: undefined, type: "multiple-select" })).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000002"
    );
    expect(answerToBytes32([true, true, false], { decimals: undefined, type: "multiple-select" })).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000003"
    );
    expect(answerToBytes32([false, false, true], { decimals: undefined, type: "multiple-select" })).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000004"
    );
    expect(answerToBytes32([true, false, true], { decimals: undefined, type: "multiple-select" })).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000005"
    );
    expect(answerToBytes32([false, true, true], { decimals: undefined, type: "multiple-select" })).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000006"
    );
    expect(answerToBytes32([true, true, true], { decimals: undefined, type: "multiple-select" })).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000007"
    );
    expect(answerToBytes32([true, false, false, false, true], { decimals: undefined, type: "multiple-select" })).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000011"
    );
  });
  it("encodes a multiple-select given as 0/1 numbers, the shape the brute-force reveal passes, like booleans", () => {
    const ms = { decimals: undefined, type: "multiple-select" };
    expect(answerToBytes32([0, 0, 0], ms)).toBe("0x0000000000000000000000000000000000000000000000000000000000000000");
    expect(answerToBytes32([1, 0, 0], ms)).toBe("0x0000000000000000000000000000000000000000000000000000000000000001");
    expect(answerToBytes32([0, 1, 0], ms)).toBe("0x0000000000000000000000000000000000000000000000000000000000000002");
    expect(answerToBytes32([1, 1, 0], ms)).toBe("0x0000000000000000000000000000000000000000000000000000000000000003");
    expect(answerToBytes32([0, 0, 1], ms)).toBe("0x0000000000000000000000000000000000000000000000000000000000000004");
    expect(answerToBytes32([1, 0, 1], ms)).toBe("0x0000000000000000000000000000000000000000000000000000000000000005");
    expect(answerToBytes32([0, 1, 1], ms)).toBe("0x0000000000000000000000000000000000000000000000000000000000000006");
    expect(answerToBytes32([1, 1, 1], ms)).toBe("0x0000000000000000000000000000000000000000000000000000000000000007");
    expect(answerToBytes32([1, 0, 0, 0, 1], ms)).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000011"
    );
  });
  it("ignores the precision for every type but uint", () => {
    expect(answerToBytes32(1704067200, { decimals: 2, type: "datetime" })).toBe(
      "0x0000000000000000000000000000000000000000000000000000000065920080"
    );
    expect(answerToBytes32(1704067200, { decimals: 18, type: "datetime" })).toBe(
      "0x0000000000000000000000000000000000000000000000000000000065920080"
    );
    expect(answerToBytes32("0x1", { decimals: 2, type: "hash" })).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000001"
    );
    expect(answerToBytes32([true, false, true], { decimals: 2, type: "multiple-select" })).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000005"
    );
    expect(answerToBytes32([1, 0, 1], { decimals: 2, type: "multiple-select" })).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000005"
    );
  });
  it("gives the same on-chain choice as before once the court adds 1", () => {
    expect(answerToVote(answerToBytes32("1.5", { decimals: 18, type: "uint" }))).toBe(
      "0x00000000000000000000000000000000000000000000000014d1120d7b160001"
    );
    expect(answerToVote(answerToBytes32([true, true, false], { decimals: undefined, type: "multiple-select" }))).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000004"
    );
  });
});

describe("getAnswerString (rendering an on-chain vote, called as answer-string.js does)", () => {
  it("names the reserved answers", () => {
    expect(getAnswerString({ type: "single-select", outcomes: ["Yes", "No"] }, INVALID)).toBe("Invalid");
    expect(getAnswerString({ type: "single-select", outcomes: ["Yes", "No"] }, ANSWERED_TOO_SOON)).toBe(
      "Answered too soon"
    );
    expect(getAnswerString({ type: "uint", decimals: 18 }, voteToAnswer(MAX_UINT256))).toBe("Answered too soon");
    expect(getAnswerString({ type: "uint", decimals: 18 }, null)).toBe("null");
  });
  it("single-select: vote n is outcome n - 1, out of range is undefined", () => {
    expect(getAnswerString({ outcomes: ["Yes", "No"], type: "single-select" }, voteToAnswer("1"))).toBe("Yes");
    expect(getAnswerString({ outcomes: ["Yes", "No"], type: "single-select" }, voteToAnswer("2"))).toBe("No");
    expect(getAnswerString({ outcomes: ["Yes", "No"], type: "single-select" }, voteToAnswer("3"))).toBeUndefined();
  });
  it("bool", () => {
    expect(getAnswerString({ type: "bool" }, voteToAnswer("1"))).toBe("No");
    expect(getAnswerString({ type: "bool" }, voteToAnswer("2"))).toBe("Yes");
  });
  it("multiple-select: the selected outcomes joined by ' / '", () => {
    expect(getAnswerString({ outcomes: ["A", "B", "C"], type: "multiple-select" }, voteToAnswer("1"))).toBe("");
    expect(getAnswerString({ outcomes: ["A", "B", "C"], type: "multiple-select" }, voteToAnswer("2"))).toBe("A");
    expect(getAnswerString({ outcomes: ["A", "B", "C"], type: "multiple-select" }, voteToAnswer("3"))).toBe("B");
    expect(getAnswerString({ outcomes: ["A", "B", "C"], type: "multiple-select" }, voteToAnswer("4"))).toBe("A / B");
    expect(getAnswerString({ outcomes: ["A", "B", "C"], type: "multiple-select" }, voteToAnswer("5"))).toBe("C");
    expect(getAnswerString({ outcomes: ["A", "B", "C"], type: "multiple-select" }, voteToAnswer("6"))).toBe("A / C");
    expect(getAnswerString({ outcomes: ["A", "B", "C"], type: "multiple-select" }, voteToAnswer("7"))).toBe("B / C");
    expect(getAnswerString({ outcomes: ["A", "B", "C"], type: "multiple-select" }, voteToAnswer("8"))).toBe(
      "A / B / C"
    );
    expect(getAnswerString({ outcomes: ["A", "B", "C", "D", "E"], type: "multiple-select" }, voteToAnswer("18"))).toBe(
      "A / E"
    );
  });
  it("uint with 18 decimals, in the library's number format (exponent notation for small values)", () => {
    expect(getAnswerString({ decimals: 18, type: "uint" }, voteToAnswer("1"))).toBe("0");
    expect(getAnswerString({ decimals: 18, type: "uint" }, voteToAnswer("2"))).toBe("1e-18");
    expect(getAnswerString({ decimals: 18, type: "uint" }, voteToAnswer("101"))).toBe("1e-16");
    expect(getAnswerString({ decimals: 18, type: "uint" }, voteToAnswer("1000000000000000001"))).toBe("1");
    expect(getAnswerString({ decimals: 18, type: "uint" }, voteToAnswer("1500000000000000001"))).toBe("1.5");
    expect(
      getAnswerString({ decimals: 18, type: "uint" }, voteToAnswer("1000000000000000000000000000000000000001"))
    ).toBe("1e+21");
  });
  it("uint with 0 decimals", () => {
    expect(getAnswerString({ decimals: 0, type: "uint" }, voteToAnswer("2"))).toBe("1");
    expect(getAnswerString({ decimals: 0, type: "uint" }, voteToAnswer("17"))).toBe("16");
    expect(getAnswerString({ decimals: 0, type: "uint" }, voteToAnswer("1000000000000000000001"))).toBe(
      "1000000000000000000000"
    );
  });
  it("int, two's complement", () => {
    expect(getAnswerString({ decimals: 0, type: "int" }, voteToAnswer("2"))).toBe("1");
    expect(
      getAnswerString(
        { decimals: 0, type: "int" },
        voteToAnswer("115792089237316195423570985008687907853269984665640564039457584007913129639932")
      )
    ).toBe("-5");
    expect(
      getAnswerString(
        { decimals: 0, type: "int" },
        voteToAnswer("57896044618658097711785492504343953926634992332820282019728792003956564819968")
      )
    ).toBe("57896044618658097711785492504343953926634992332820282019728792003956564819967");
  });
  it("hash", () => {
    expect(
      getAnswerString(
        { type: "hash" },
        voteToAnswer("72155939486846849509759369733266486982821795810448245423168957390607644363273")
      )
    ).toBe("0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08");
  });
  it("datetime: the court passes no precision, so the library's default of one day applies", () => {
    expect(getAnswerString({ type: "datetime" }, voteToAnswer("1704067201"))).toBe("2024-01-01");
    expect(getAnswerString({ type: "datetime" }, voteToAnswer("1704070801"))).toBe(
      "[Invalid datetime]: 2024-01-01 01hr"
    );
    expect(getAnswerString({ type: "datetime" }, voteToAnswer("1704067262"))).toBe(
      "[Invalid datetime]: 2024-01-01 00:01:01"
    );
    expect(getAnswerString({ type: "datetime" }, voteToAnswer("1735689600"))).toBe(
      "[Invalid datetime]: 2024-12-31 23:59:59"
    );
    expect(getAnswerString({ type: "datetime", precision: "s" }, padToBytes32((1704067261).toString(16)))).toBe(
      "2024-01-01 00:01:01"
    );
  });
  it("vote 0 (refuse to arbitrate) gives junk the callers guard against: undefined or a throw", () => {
    expect(getAnswerString({ outcomes: ["Yes", "No"], type: "single-select" }, voteToAnswer("0"))).toBeUndefined();
    expect(() => getAnswerString({ decimals: 18, type: "uint" }, voteToAnswer("0"))).toThrow("Invalid character");
  });
});

describe("bytes32ToString", () => {
  it("decodes int and hash answers", () => {
    expect(bytes32ToString("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffb", { type: "int" })).toBe(
      "-5"
    );
    expect(bytes32ToString(HASH.toUpperCase().replace("0X", "0x"), { type: "hash" })).toBe(
      "0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
    );
    expect(() => bytes32ToString("0x" + "0".repeat(62) + "-1", { type: "uint" })).toThrow("Invalid character");
  });
});

describe("isolation from the court's global BigNumber configuration", () => {
  it("formats the same way after answer-string.js has changed EXPONENTIAL_AT", () => {
    const before = BigNumber.config();
    try {
      BigNumber.config({ EXPONENTIAL_AT: 1e9 });
      expect(getAnswerString({ decimals: 18, type: "uint" }, voteToAnswer("101"))).toBe("1e-16");
    } finally {
      BigNumber.config({ EXPONENTIAL_AT: before.EXPONENTIAL_AT });
    }
  });
});
