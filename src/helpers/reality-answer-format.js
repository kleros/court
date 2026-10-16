import BigNumberBase from "bignumber.js";

// Encoding and display of Reality.eth-style answers, for the metaEvidence ruling types the court supports
// (`uint`, `int`, `datetime`, `hash`, `bool`, `single-select`, `multiple-select`).
//
// These are the functions the court used from `@reality.eth/reality-eth-lib/formatters/question` (3.4.6), plus
// `bytes32ToString` which `getAnswerString` needs, copied here so that the dependency could be removed. For every input
// the court passes, the output must stay identical to the library's: `answerToBytes32` and `padToBytes32` produce the
// choice that jurors commit to and cast, and `getAnswerString` renders the votes already on-chain. Quirks of the
// library are therefore kept on purpose (see `reality-answer-format.test.js`, whose expected values were recorded from
// the library). Malformed inputs the court never passes, such as numbers or whitespace where a hex string is expected,
// throw here where the library coerced them. `int` answers are only decoded, for display: the vote form has no input
// for them, so encoding them is not supported.
//
// The court changes BigNumber's global formatting configuration (`EXPONENTIAL_AT`) while rendering numeric votes. The
// library used its own copy of bignumber.js with the default configuration, so this module uses a private clone with
// the defaults too, otherwise the strings it produces would depend on which component ran last.
const BigNumber = BigNumberBase.clone();

const UINT256_MAX = new BigNumber("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
const TWO_POW_255 = new BigNumber(2).pow(255);
const TWO_POW_256 = new BigNumber(2).pow(256);

// -1 and -2 in two's complement: the Reality.eth answers for "Invalid" and "Answered too soon".
const INVALID_ANSWER = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const ANSWERED_TOO_SOON_ANSWER = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe";

const DATETIME_PRECISIONS = ["Y", "m", "d", "H", "i", "s"];

const parseDecimals = (decimals) => parseInt(decimals) || 0;

const tenPow = (decimals) => new BigNumber(10).pow(new BigNumber(decimals));

// The library parsed these hex strings with bn.js 5: an optional leading "-", then hex digits in either case (an empty
// string is 0); anything else throws, and callers rely on that, e.g. for the junk the court builds for the "Refuse to
// Arbitrate" vote (see AnswerDisplay). The regex reproduces the check and bignumber.js does the parsing, lowercased
// first because it accepts "FF" and "ff" but not "fF". The bn.js hoisted in this project is 4.x, whose hex parser
// silently accepts junk, so it could not simply be reused.
const hexToBigNumber = (hex) => {
  if (!/^-?[0-9a-fA-F]*$/.test(hex)) throw Error("Invalid character in " + hex);
  return new BigNumber(hex.toLowerCase(), 16);
};

export const padToBytes32 = (n) => {
  let padded = n;
  while (padded.length < 64) padded = "0" + padded;
  return "0x" + padded;
};

// Upper bound of the answers of the question type in the question's unit: 2^256 - 1 divided by 10^decimals, as the
// library computed it.
export const maxNumber = (qjson) => {
  let divby = new BigNumber(1);
  if (qjson.decimals) divby = tenPow(qjson.decimals);
  return UINT256_MAX.dividedBy(divby);
};

// `selections[i]` is bit i of the bitmask.
const arrayToBitmask = (selections) => {
  let bitstr = "";
  for (let i = 0; i < selections.length; i++) bitstr = (selections[i] ? "1" : "0") + bitstr;
  return new BigNumber(bitstr, 2);
};

// Encodes an answer as the bytes32 hex string that Reality.eth stores on-chain.
// `answer` is an array of booleans for `multiple-select`, a unix timestamp for `datetime`, a hex string for `hash` and
// a decimal string otherwise. Like the library, a `uint` answer is multiplied by 10^decimals (giving a hex string) and
// then read as hex, so with 0 decimals the raw decimal input itself is read as hex ("10" encodes 0x10).
export const answerToBytes32 = (answer, qjson) => {
  const qtype = qjson.type;
  let value = answer;
  if (qtype === "multiple-select") value = arrayToBitmask(answer);
  const decimals = qtype === "uint" ? parseDecimals(qjson.decimals) : 0;
  if (decimals > 0) value = new BigNumber(value).times(tenPow(decimals)).toString(16);
  if (qtype === "uint") return padToBytes32(hexToBigNumber(value).toString(16));
  return padToBytes32(new BigNumber(value).toString(16));
};

// Decodes a bytes32 answer into the decimal string (or lowercase hex string for `hash`) in the question's unit.
export const bytes32ToString = (bytes32str, qjson) => {
  const qtype = qjson.type;
  const decimals = parseDecimals(qjson.decimals);
  const hex = bytes32str.replace(/^0x/, "");
  if (qtype === "hash") return padToBytes32(hexToBigNumber(hex).toString(16));

  let n;
  if (qtype === "int") {
    n = hexToBigNumber(hex);
    if (n.gte(TWO_POW_255)) n = n.minus(TWO_POW_256);
  } else if (qtype === "uint" || qtype === "datetime") {
    n = hexToBigNumber(hex);
  } else {
    throw Error("Unrecognized answer type " + qtype);
  }

  // `toFixed` never uses exponent notation; the division below may, like the library.
  let ans = n.toFixed();
  if (decimals > 0) ans = new BigNumber(ans).dividedBy(tenPow(decimals)).toString();
  return ans;
};

const pad2 = (n) => ("0" + n).slice(-2);

const datetimeToString = (questionJson, answer) => {
  const precision = DATETIME_PRECISIONS.includes(questionJson.precision) ? questionJson.precision : "d";
  const dateObj = new Date(parseInt(bytes32ToString(answer, questionJson)) * 1000);

  const year = dateObj.getUTCFullYear();
  const month = dateObj.getUTCMonth() + 1;
  const date = dateObj.getUTCDate();
  const hour = dateObj.getUTCHours();
  const min = dateObj.getUTCMinutes();
  const sec = dateObj.getUTCSeconds();

  // Everything the precision asks for is shown, plus anything above it.
  const needm = precision !== "Y";
  const needd = needm && precision !== "m";
  const needH = needd && precision !== "d";
  const needi = needH && precision !== "H";
  const needs = needi && precision !== "i";

  // A unit is shown when the precision needs it or it is non-zero; a non-zero unit also forces every coarser unit
  // above it to show (seconds -> minutes -> hours -> day -> month).
  const hass = needs || sec > 0;
  const hasi = needi || hass || min > 0;
  const hasH = needH || hasi || hour > 0;
  const hasd = needd || hasH || date > 1;
  const hasm = needm || hasd || month > 1;

  // The answer is more precise than the question allows.
  const invalid = (!needm && hasm) || (!needd && hasd) || (!needH && hasH) || (!needi && hasi) || (!needs && hass);

  let label = invalid ? "[Invalid datetime]: " : "";
  label += year;
  if (hasm) label += "-" + pad2(month);
  if (hasd) label += "-" + pad2(date);
  if (hasH) label += " " + pad2(hour);
  if (hasi) label += ":" + pad2(min);
  else if (hasH) label += "hr"; // "2021-12-23 11" without the minutes is hard to understand.
  if (hass) label += ":" + pad2(sec);
  return label;
};

// Renders a bytes32 answer as text, given `{ type, decimals, outcomes, precision }`.
export const getAnswerString = (questionJson, answer) => {
  if (answer === null) return "null";
  if (answer === INVALID_ANSWER) return "Invalid";
  if (answer === ANSWERED_TOO_SOON_ANSWER) return "Answered too soon";

  const outcomes = questionJson.outcomes;
  switch (questionJson.type) {
    case "uint":
    case "int":
    case "hash":
      return bytes32ToString(answer, questionJson);
    case "bool": {
      const value = new BigNumber(answer).toNumber();
      if (value === 1) return "Yes";
      if (value === 0) return "No";
      return "";
    }
    case "single-select":
      if (outcomes && outcomes.length > 0) return outcomes[new BigNumber(answer).toNumber()];
      return "";
    case "multiple-select": {
      if (!outcomes || outcomes.length === 0) return "";
      const answerBits = new BigNumber(answer).toString(2);
      const entries = [];
      for (let i = outcomes.length - 1; i >= 0; i--) {
        if (answerBits[i] === "1") entries.push(outcomes[answerBits.length - 1 - i]);
      }
      return entries.join(" / ");
    }
    case "datetime":
      return datetimeToString(questionJson, answer);
    default:
      return "";
  }
};
