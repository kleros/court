import Web3 from "web3";
import createError from "../../helpers/create-error";
import { promiEventToAsyncGenerator } from "../../helpers/transactions";

const { toBN } = Web3.utils;

const MAX_UINT256 = toBN("2").pow(toBN("256")).sub(toBN("1"));

export function createReadOnlyApi({ chainId, tokenBridge, wrappedPinakion, klerosLiquidExtraViews }) {
  async function getBalance({ address }) {
    return toBN(await wrappedPinakion.methods.balanceOf(address).call());
  }

  async function getStake({ address, subcourtId = "0" }) {
    return toBN(await klerosLiquidExtraViews.methods.stakeOf(address, subcourtId).call());
  }

  // eslint-disable-next-line no-unused-vars
  async function getAllowance({ address }) {
    return MAX_UINT256;
  }

  async function getFee({ amount }) {
    amount = toBN(amount);

    const feeType = await tokenBridge.methods.HOME_TO_FOREIGN_FEE().call();
    const token = wrappedPinakion.options.address;
    return toBN(await tokenBridge.methods.calculateFee(feeType, token, amount).call());
  }

  async function getRelayedAmount({ originalAmount }) {
    return toBN(originalAmount).sub(await getFee({ amount: originalAmount }));
  }

  const BASIS_POINTS_MULTIPLIER = toBN("10000");

  async function getRequiredAmount({ desiredAmount }) {
    desiredAmount = toBN(desiredAmount);

    if (desiredAmount.isZero()) {
      return toBN("0");
    }

    const fee = await getFee({ amount: desiredAmount });
    const feeRateBasisPoints = fee.mul(BASIS_POINTS_MULTIPLIER).div(desiredAmount);

    /**
     * To obtain the required amount to get exactly the desired amount when bridging,
     * we have the following equation:
     *
     *  d = r - f
     *  d = r - r*ρ
     *  d = r * (1 - 1*ρ)
     *  r = d / (1 - 1*ρ)
     *  r = 10000*d / (10000 - 10000*ρ)
     *
     * where:
     *  d: desired amount
     *  r: required amount
     *  f: fee
     *  ρ: fee rate
     */
    return desiredAmount.mul(BASIS_POINTS_MULTIPLIER).div(BASIS_POINTS_MULTIPLIER.sub(feeRateBasisPoints));
  }

  return {
    chainId,
    getBalance,
    getStake,
    getAllowance,
    getFee,
    getRelayedAmount,
    getRequiredAmount,
  };
}

export function createFullApi({ chainId, tokenBridge, wrappedPinakion, klerosLiquidExtraViews }) {
  const readOnlyApi = createReadOnlyApi({ chainId, tokenBridge, wrappedPinakion, klerosLiquidExtraViews });
  const { getBalance } = readOnlyApi;

  async function* relayTokens({ address, amount }) {
    amount = toBN(amount);

    const balance = await getBalance({ address });

    if (balance.lt(amount)) {
      throw createError("Amount is greater than balance");
    }

    const buffer = {
      approve: { state: "skipped" },
      relay: { state: "none" },
    };

    yield { ...buffer };
    try {
      for await (const relay of promiEventToAsyncGenerator(
        wrappedPinakion.methods.withdrawAndConvertToPNK(amount, address).send({ from: address })
      )) {
        buffer.relay = relay;
        yield { ...buffer, relay };
      }
    } catch (err) {
      throw createError("Failed to relay tokens", err);
    }
  }

  return {
    ...readOnlyApi,
    relayTokens,
  };
}
