import BigNumber from "bignumber.js";
import { getAnswerString as formatAnswer, padToBytes32 } from "../helpers/reality-answer-format";
import Web3 from "web3";
const { toBN } = Web3.utils;

export const RTA_LABEL = "Refuse to Arbitrate / Invalid";

export const getAnswerString = (rulingOptions, vote, uintDisplayMode = "dec") => {
  const questionJson = {
    decimals: rulingOptions.precision,
    outcomes: rulingOptions.titles,
    type: rulingOptions.type,
  };

  const returnString = formatAnswer(questionJson, padToBytes32(toBN(vote).sub(toBN("1")).toString(16)));

  const isNumericAnswer =
    /^\d+[.,]?\d*(e[-+]?\d+)?$/.test(returnString) && ["uint", "int"].includes(rulingOptions.type);

  if (isNumericAnswer) {
    if (uintDisplayMode === "hex") {
      return padToBytes32(toBN(vote).sub(toBN("1")).toString(16));
    }
    if (uintDisplayMode === "dec") {
      BigNumber.config({ EXPONENTIAL_AT: 1e9 });
    } else {
      BigNumber.config({ EXPONENTIAL_AT: [-3, 1e9] });
    }
    const returnStringFormated = new BigNumber(returnString);
    return returnStringFormated.toString();
  }

  return returnString;
};

// The label Court shows for a ruling, or undefined when the ruling has none in these ruling options.
export const getRulingLabel = (rulingOptions, ruling, uintDisplayMode) => {
  if (ruling === "0") return RTA_LABEL;
  try {
    return (rulingOptions && getAnswerString(rulingOptions, ruling, uintDisplayMode)) || undefined;
  } catch {
    return undefined;
  }
};
