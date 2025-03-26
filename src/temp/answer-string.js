import BigNumber from "bignumber.js";
import * as realitioLibQuestionFormatter from "@reality.eth/reality-eth-lib/formatters/question";
import Web3 from "web3";
const { toBN } = Web3.utils;

export const getAnswerString = (rulingOptions, vote, uintDisplayMode = "dec") => {
  const questionJson = {
    decimals: rulingOptions.precision,
    outcomes: rulingOptions.titles,
    type: rulingOptions.type,
  };

  const returnString = realitioLibQuestionFormatter.getAnswerString(
    questionJson,
    realitioLibQuestionFormatter.padToBytes32(toBN(vote).sub(toBN("1")).toString(16))
  );

  const isNumericAnswer =
    /^\d+[.,]?\d*(e[-+]?\d+)?$/.test(returnString) && ["uint", "int"].includes(rulingOptions.type);

  if (isNumericAnswer) {
    if (uintDisplayMode === "hex") {
      return realitioLibQuestionFormatter.padToBytes32(toBN(vote).sub(toBN("1")).toString(16));
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
