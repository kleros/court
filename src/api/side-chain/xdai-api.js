import Web3 from "web3";
import createError from "../../helpers/create-error";
import { promiEventToAsyncGenerator } from "../../helpers/transactions";

const { toBN } = Web3.utils;

const MAX_UINT256 = toBN("2").pow(toBN("256")).sub(toBN("1"));

export function createApi({ chainId, tokenBridge, wrappedPinakion, xPinakion, klerosLiquidExtraViews }) {
  async function getBalance({ address }) {
    return toBN(await wrappedPinakion.methods.balanceOf(address).call());
  }

  // eslint-disable-next-line no-unused-vars
  async function getAllowance({ address }) {
    return MAX_UINT256;
  }

  async function getRawBalance({ address }) {
    return toBN(await xPinakion.methods.balanceOf(address).call());
  }

  async function getRawAllowance({ address }) {
    return toBN(await xPinakion.methods.allowance(address, wrappedPinakion.options.address).call());
  }

  async function getStake({ address, subcourtId = "0" }) {
    return toBN(await klerosLiquidExtraViews.methods.stakeOf(address, subcourtId).call());
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

  async function* deposit({ address, amount }) {
    amount = toBN(amount);

    const [balance, allowance] = await Promise.all([getRawBalance({ address }), getRawAllowance({ address })]);

    if (balance.lt(amount)) {
      throw createError("Amount is greater than balance");
    }

    const buffer = [
      { key: "approve", state: "none" },
      { key: "deposit", state: "none" },
    ];

    // Only call approve if there is not enough allowance for the bridge to spend tokens
    if (allowance.lt(amount)) {
      yield [...buffer];
      try {
        for await (const approve of promiEventToAsyncGenerator(
          xPinakion.methods.approve(wrappedPinakion.options.address, amount).send({ from: address })
        )) {
          buffer[0] = {
            ...buffer[0],
            ...approve,
          };

          yield [...buffer];
        }
      } catch (err) {
        throw createError("Failed to approve PNK spend", err);
      }
    } else {
      buffer[0] = {
        ...buffer[0],
        state: "skipped",
      };
      yield [...buffer];
    }

    try {
      for await (const deposit of promiEventToAsyncGenerator(
        wrappedPinakion.methods.deposit(amount).send({ from: address })
      )) {
        buffer[1] = {
          ...buffer[1],
          ...deposit,
        };
        yield [...buffer];
      }
    } catch (err) {
      throw createError("Failed to deposit tokens", err);
    }
  }

  async function* withdraw({ amount, address }) {
    amount = toBN(amount);

    const balance = await getBalance({ address });

    if (balance.lt(amount)) {
      throw createError("Amount is greater than balance");
    }

    const buffer = [{ key: "withdraw", state: "none" }];

    yield [...buffer];
    try {
      for await (const deposit of promiEventToAsyncGenerator(
        wrappedPinakion.methods.withdrawAndConvertToPNK(amount, address).send({ from: address })
      )) {
        yield [{ ...buffer[0], ...deposit }];
      }
    } catch (err) {
      throw createError("Failed to deposit tokens", err);
    }
  }

  return {
    chainId,
    getBalance,
    getAllowance,
    getRawBalance,
    getRawAllowance,
    getStake,
    getFee,
    getRelayedAmount,
    getRequiredAmount,
    deposit,
    withdraw,
  };
}
