import BigNumber from "bignumber.js";
import * as realitioLibQuestionFormatter from "@reality.eth/reality-eth-lib/formatters/question";
import Web3 from "web3";
const { toBN } = Web3.utils;

export const getAnswerString = (rulingOptions, vote, hex = false) => {
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
    if (hex) {
      return realitioLibQuestionFormatter.padToBytes32(toBN(vote).sub(toBN("1")).toString(16));
    }
    BigNumber.config({ EXPONENTIAL_AT: 1e9 });
    const noExponential = new BigNumber(returnString);
    return noExponential.toString();
  }

  return returnString;
};
