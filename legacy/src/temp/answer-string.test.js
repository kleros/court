import BigNumber from "bignumber.js";
import Web3 from "web3";
import { getAnswerString } from "./answer-string";

// getAnswerString turns an on-chain vote (the Reality.eth answer + 1) into the text shown to users. Every expected value
// below was produced by this file's code on master, where it called @reality.eth/reality-eth-lib 3.4.6.

const { toBN } = Web3.utils;
const ANSWERED_TOO_SOON_VOTE = toBN(2).pow(toBN(256)).sub(toBN(1)).toString();

describe("getAnswerString", () => {
  const before = BigNumber.config();
  afterEach(() => BigNumber.config({ EXPONENTIAL_AT: before.EXPONENTIAL_AT }));

  it("subtracts 1 from the vote to get the answer", () => {
    const yesNo = { type: "single-select", titles: ["Yes", "No"] };
    expect(getAnswerString(yesNo, "1")).toBe("Yes");
    expect(getAnswerString(yesNo, "2")).toBe("No");
    expect(getAnswerString({ type: "multiple-select", titles: ["A", "B", "C"] }, "6")).toBe("A / C");
  });
  it("shows a uint in the selected display mode", () => {
    const uint18 = { type: "uint", precision: 18 };
    expect(getAnswerString(uint18, "2")).toBe("0.000000000000000001");
    expect(getAnswerString(uint18, "2", "sci")).toBe("1e-18");
    expect(getAnswerString(uint18, "2", "hex")).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000001"
    );
    expect(getAnswerString(uint18, "1500000000000000001")).toBe("1.5");
    expect(getAnswerString(uint18, "1500000000000000001", "sci")).toBe("1.5");
  });
  it("names the Answered too soon vote", () => {
    expect(getAnswerString({ type: "single-select", titles: ["Yes", "No"] }, ANSWERED_TOO_SOON_VOTE)).toBe(
      "Answered too soon"
    );
    expect(getAnswerString({ type: "uint", precision: 18 }, ANSWERED_TOO_SOON_VOTE)).toBe("Answered too soon");
  });
});
