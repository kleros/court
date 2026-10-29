import Web3 from "web3";
import {
  appliedRuling,
  cloneTarget,
  decisionLines,
  familyOf,
  isReasonConfirmed,
  loserDeadline,
} from "./appeal-display";
import { getRulingLabel, RTA_LABEL } from "../temp/answer-string";

// Disputes, rulings, funding and appeal periods below are real: they come from the reader specs verified on chain on
// 2026-10-29. Ruling option titles are examples.

const { padLeft, toHex } = Web3.utils;
const MAX_UINT = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
const word = (value) => padLeft(toHex(value), 64);

const yesNo = { type: "single-select", titles: ["Yes", "No"] };
const lines = ({ rulingOptions = yesNo, ...dispute }) =>
  decisionLines({
    ...dispute,
    label: (ruling) => getRulingLabel(rulingOptions, ruling),
    optionsKnown: Boolean(rulingOptions?.type),
  });

describe("appliedRuling", () => {
  it("is the value of the Ruling events when there is exactly one", () => {
    expect(appliedRuling([word(2)])).toBe("2");
    expect(appliedRuling([word(1), word(1)])).toBe("1");
    expect(appliedRuling([word(MAX_UINT)])).toBe(MAX_UINT);
  });
  it("is unreadable with no event, different values or malformed data", () => {
    expect(appliedRuling([])).toBeNull();
    expect(appliedRuling([word(1), word(2)])).toBeNull();
    expect(appliedRuling(["0x02"])).toBeNull();
  });
});

describe("isReasonConfirmed", () => {
  it("needs the applied ruling to be the only one fully funded", () => {
    expect(isReasonConfirmed(["2"], "2")).toBe(true);
    expect(isReasonConfirmed([MAX_UINT], MAX_UINT)).toBe(true);
    expect(isReasonConfirmed([], "2")).toBe(false);
    expect(isReasonConfirmed(["1"], "2")).toBe(false);
    expect(isReasonConfirmed(["1", "2"], "2")).toBe(false);
  });
});

describe("familyOf", () => {
  it("recognises exact code on its chain only", () => {
    // Mainnet PoH v1 0xc5e9ddeb.
    expect(familyOf(1, { codeHash: "0x83ef5a6f14314b2bb6a5d5bdb0b76b8f12913c3f7c7d4107239ca20db7f58504" })).toBe(
      "pohV1"
    );
    expect(
      familyOf(100, { codeHash: "0x83ef5a6f14314b2bb6a5d5bdb0b76b8f12913c3f7c7d4107239ca20db7f58504" })
    ).toBeUndefined();
    expect(familyOf(1, { codeHash: `0x${"ab".repeat(32)}` })).toBeUndefined();
    expect(
      familyOf(11155111, { codeHash: "0x83ef5a6f14314b2bb6a5d5bdb0b76b8f12913c3f7c7d4107239ca20db7f58504" })
    ).toBeUndefined();
  });
  it("recognises Curate light clones by their target's code", () => {
    const cloneTargetCodeHash = "0x4e4fa06e2921a8b7bdf0536317fd3a50b4b59d672d10d2dc5c45d4fae5f95e0c";
    expect(familyOf(100, { cloneTargetCodeHash })).toBe("curateLight");
    expect(familyOf(1, { cloneTargetCodeHash })).toBe("curateLight");
    expect(familyOf(100, { codeHash: cloneTargetCodeHash })).toBeUndefined();
  });
  it("recognises PoH v2 only while its proxy points to the implementation read", () => {
    const codeHash = "0xf221c7a2a59560e24da34a541d83c39a66c173b88b66810a3509f6972333f6b2";
    expect(familyOf(100, { codeHash, implementation: "0x85b88e38fb6cbc8059009902f76c47f902373f52" })).toBe("pohV2");
    expect(familyOf(100, { codeHash, implementation: "0x0000000000000000000000000000000000000001" })).toBeUndefined();
  });
});

describe("cloneTarget", () => {
  const target = "1111111111111111111111111111111111111111";
  it("reads the target of an exact EIP-1167 clone", () => {
    expect(cloneTarget(`0x363d3d373d3d3d363d73${target}5af43d82803e903d91602b57fd5bf3`)).toBe(`0x${target}`);
  });
  it("ignores any other code", () => {
    expect(cloneTarget(`0x363d3d373d3d3d363d73${target}5af43d82803e903d91602b57fd5bf300`)).toBeUndefined();
    expect(cloneTarget("0x")).toBeUndefined();
  });
});

describe("loserDeadline", () => {
  it("is half the appeal period on Curate, PoH and the Reality single-chain proxies", () => {
    // Mainnet 1100 (Curate classic), court ruled 2.
    expect(
      loserDeadline({
        family: "curateClassic",
        courtRuling: "2",
        lastPeriodChange: "1643684591",
        appealPeriodTime: "302400",
      })
    ).toBe(1643835791);
    // Gnosis 1049 (PoH v2), court ruled 2.
    expect(
      loserDeadline({ family: "pohV2", courtRuling: "2", lastPeriodChange: "1793079005", appealPeriodTime: "194400" })
    ).toBe(1793176205);
    // Mainnet 1680 (Reality single-chain), a tie: every answer but Refuse to Arbitrate has the deadline.
    expect(
      loserDeadline({
        family: "realitySingleChain",
        courtRuling: "0",
        lastPeriodChange: "1791597047",
        appealPeriodTime: "388800",
      })
    ).toBe(1791791447);
  });
  it("uses the live multiplier of the Dispute Resolver and cross-chain Reality proxies", () => {
    // Mainnet 1347 (cross-chain Reality, 50%).
    const dispute = { family: "realityCrossChain", courtRuling: "1", lastPeriodChange: "1669539647" };
    expect(loserDeadline({ ...dispute, multiplier: "5000", appealPeriodTime: "388800" })).toBe(1669734047);
    // Gnosis 104 (Dispute Resolver, 50%).
    expect(
      loserDeadline({
        family: "disputeResolver",
        multiplier: "5000",
        courtRuling: "1",
        lastPeriodChange: "1687128135",
        appealPeriodTime: "216000",
      })
    ).toBe(1687236135);
    expect(loserDeadline({ ...dispute, multiplier: "10000", appealPeriodTime: "388800" })).toBeNull();
    expect(loserDeadline({ ...dispute, multiplier: MAX_UINT, appealPeriodTime: "388800" })).toBeNull();
  });
  it("is null when every side has the same time", () => {
    const dispute = { courtRuling: "0", lastPeriodChange: "1641583983", appealPeriodTime: "302400" };
    // Mainnet 1070 (Curate light), a tie.
    expect(loserDeadline({ ...dispute, family: "curateLight" })).toBeNull();
    expect(loserDeadline({ ...dispute, family: "governor" })).toBeNull();
    for (const family of ["binaryProxy2019", "escrowV1", "realityNoAppeal", "binaryProxyMinimal"])
      expect(loserDeadline({ ...dispute, family, courtRuling: "2" })).toBeNull();
  });
});

describe("decisionLines", () => {
  it("says the ruling is not executed yet before execution (Mainnet 1684, 0x799c)", () => {
    expect(lines({ ruled: false, courtRuling: "0" })).toEqual({
      main: `The court ruled “${RTA_LABEL}”.`,
      detail: "The ruling has not been executed yet.",
    });
    expect(lines({ ruled: false, courtRuling: "2" })).toEqual({
      main: "The court ruled “No”.",
      detail: "The ruling has not been executed yet.",
    });
  });
  it("shows the court's ruling as the winner when the contract applied it", () => {
    // Gnosis 900 (Curate light), a tie that was executed as such.
    expect(lines({ ruled: true, applied: "0", courtRuling: "0" })).toEqual({
      main: `The winner in this case was: “${RTA_LABEL}”.`,
    });
  });
  it("gives the reason when the dispute's own funding confirms it", () => {
    const reason = (winner, court) => ({
      main: `The winner in this case was: “${winner}”.`,
      detail: `The court ruled “${court}”. Only “${winner}” was fully funded for an appeal, so it won without a new round.`,
    });
    // Mainnet 1495 (PoH v1), Gnosis 939 (Curate light), Gnosis 1045 (PoH v2): court 0, applied 2, only 2 funded.
    for (const id of ["1495", "939", "1045"])
      expect([id, lines({ ruled: true, applied: "2", courtRuling: "0", reasonConfirmed: true })]).toEqual([
        id,
        reason("No", RTA_LABEL),
      ]);
    // Gnosis 1042 (Curate light): court 2, applied 1, only 1 funded.
    expect(lines({ ruled: true, applied: "1", courtRuling: "2", reasonConfirmed: true })).toEqual(reason("Yes", "No"));
  });
  it("gives no reason when the funding can't confirm it (Mainnet 1678, Unslashed)", () => {
    expect(lines({ ruled: true, applied: "2", courtRuling: "0", reasonConfirmed: false })).toEqual({
      main: "The winner in this case was: “No”.",
      detail: `The court ruled “${RTA_LABEL}”.`,
    });
  });
  it("claims no winner when the applied ruling can't be read", () => {
    expect(lines({ ruled: true, applied: null, courtRuling: "1" })).toEqual({ main: "The court ruled “Yes”." });
  });
  it("never names a ruling that is not one of the options as the winner", () => {
    expect(lines({ ruled: true, applied: "3", courtRuling: "1", reasonConfirmed: true })).toEqual({
      main: "The court ruled “Yes”.",
      detail: "The contract applied a ruling that is not one of this case's options.",
    });
  });
  it("claims no winner and no option when the case's options are unknown", () => {
    for (const rulingOptions of [null, { titles: ["Yes", "No"] }]) {
      expect(lines({ ruled: true, applied: "2", courtRuling: "0", reasonConfirmed: true, rulingOptions })).toEqual({
        main: `The court ruled “${RTA_LABEL}”.`,
      });
      expect(lines({ ruled: true, applied: "3", courtRuling: "1", rulingOptions })).toEqual({
        main: "The court ruled “Unknown Choice”.",
      });
    }
  });
  it("prints the big Reality rulings with Court's labels (Mainnet 1347, 1658)", () => {
    // 2^256 - 1 is Reality's "Answered too soon" answer, which Court's labels name.
    expect(lines({ ruled: true, applied: MAX_UINT, courtRuling: "1", reasonConfirmed: true })).toEqual({
      main: "The winner in this case was: “Answered too soon”.",
      detail:
        "The court ruled “Yes”. Only “Answered too soon” was fully funded for an appeal, so it won without a new round.",
    });
    // A uint question with 18 decimals (example options).
    const uint18 = { type: "uint", precision: 18 };
    expect(
      lines({
        ruled: true,
        applied: "4243172404000000000000000001",
        courtRuling: "4243172405",
        reasonConfirmed: true,
        rulingOptions: uint18,
      }).main
    ).toBe("The winner in this case was: “4243172404”.");
  });
  it("adds the ruling numbers when two different rulings have the same label", () => {
    const rulingOptions = { type: "single-select", titles: ["Same", "Same"] };
    expect(lines({ ruled: true, applied: "2", courtRuling: "1", reasonConfirmed: false, rulingOptions })).toEqual({
      main: "The winner in this case was: “Same” (ruling 2).",
      detail: "The court ruled “Same” (ruling 1).",
    });
  });
});
