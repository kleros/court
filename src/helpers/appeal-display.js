import Web3 from "web3";
import { FAMILIES, RECOGNISED_CODE } from "../temp/arbitrable-families";

// What the case page says about an executed ruling and about the losing side's appeal deadline. Rulings are decimal
// strings, compared as such and never converted to Number: a ruling can be any uint256.

const { toBN } = Web3.utils;

const EIP1167_CLONE = /^0x363d3d373d3d3d363d73([0-9a-f]{40})5af43d82803e903d91602b57fd5bf3$/i;

// The address an EIP-1167 clone delegates to, or undefined when the code is not exactly such a clone.
export const cloneTarget = (code) => {
  const match = EIP1167_CLONE.exec(code);
  return match ? `0x${match[1].toLowerCase()}` : undefined;
};

export const isRecognisedProxy = (chainId, codeHash) => Boolean(RECOGNISED_CODE[chainId]?.proxies[codeHash]);

// The type of an arbitrable from its code: the keccak256 of its code, of its clone target's code, or of its proxy code
// plus the implementation in its EIP-1967 slot. undefined when Court does not know the code.
export const familyOf = (chainId, { codeHash, cloneTargetCodeHash, implementation }) => {
  const known = RECOGNISED_CODE[chainId];
  if (!known) return undefined;
  if (cloneTargetCodeHash) return known.cloneTargets[cloneTargetCodeHash];
  const proxy = known.proxies[codeHash];
  if (proxy) return implementation === proxy.implementation ? proxy.family : undefined;
  return known.code[codeHash];
};

// The ruling the arbitrable applied, from the data of its Ruling events: only when there is exactly one distinct value.
export const appliedRuling = (rulingData) => {
  if (rulingData.some((data) => !/^0x[0-9a-fA-F]{64}$/.test(data))) return null;
  const values = new Set(rulingData.map((data) => toBN(data).toString()));
  return values.size === 1 ? [...values][0] : null;
};

// The applied ruling won by default when it is the only ruling fully funded in the last round.
export const isReasonConfirmed = (fundedRulings, applied) => fundedRulings.length === 1 && fundedRulings[0] === applied;

// Unix time until which the losing side can fund an appeal (strictly before it), or null when every side has the same
// time.
export const loserDeadline = ({ family, multiplier, courtRuling, lastPeriodChange, appealPeriodTime }) => {
  const { loserWindow, rulingZero } = FAMILIES[family];
  if (loserWindow === "none" || (courtRuling === "0" && rulingZero === "all-full")) return null;
  const share = toBN(loserWindow === "half" ? 5000 : multiplier);
  if (share.gten(10000)) return null;
  return toBN(lastPeriodChange).add(toBN(appealPeriodTime).mul(share).divn(10000)).toNumber();
};

// The decision box of an execution period case. `label(ruling)` is the ruling's label, undefined when it has none, and
// `optionsKnown` whether Court has the case's options to label rulings with.
export const decisionLines = ({ ruled, applied, courtRuling, reasonConfirmed, label, optionsKnown }) => {
  const courtLabel = label(courtRuling) ?? "Unknown Choice";
  if (!ruled) return { main: `The court ruled “${courtLabel}”.`, detail: "The ruling has not been executed yet." };
  if (applied === null) return { main: `The court ruled “${courtLabel}”.` };
  if (applied === courtRuling) return { main: `The winner in this case was: “${courtLabel}”.` };

  const appliedLabel = label(applied);
  // Without the options, the applied ruling can't be named, nor said not to be one of them.
  if (appliedLabel === undefined && !optionsKnown) return { main: `The court ruled “${courtLabel}”.` };
  if (appliedLabel === undefined)
    return {
      main: `The court ruled “${courtLabel}”.`,
      detail: "The contract applied a ruling that is not one of this case's options.",
    };
  // Two rulings with the same label are told apart by their numbers.
  const sameLabel = appliedLabel === courtLabel;
  const winner = sameLabel ? `“${appliedLabel}” (ruling ${applied})` : `“${appliedLabel}”`;
  const court = sameLabel ? `“${courtLabel}” (ruling ${courtRuling})` : `“${courtLabel}”`;
  return {
    main: `The winner in this case was: ${winner}.`,
    detail: reasonConfirmed
      ? `The court ruled ${court}. Only ${winner} was fully funded for an appeal, so it won without a new round.`
      : `The court ruled ${court}.`,
  };
};
