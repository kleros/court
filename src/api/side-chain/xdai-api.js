import Web3 from "web3";
import createError from "../../helpers/create-error";
import { promiEventToAsyncGenerator } from "../../helpers/transactions";

const { BN, toBN, toWei } = Web3.utils;

const ZERO = toBN("0");

export function createApi({
  chainId,
  destinationChainId,
  tokenBridge,
  wrappedPinakion,
  xPinakion,
  klerosLiquid,
  klerosLiquidExtraViews,
}) {
  async function getBalance({ address }) {
    return toBN(await wrappedPinakion.methods.balanceOf(address).call());
  }

  async function getRawBalance({ address }) {
    return toBN(await xPinakion.methods.balanceOf(address).call());
  }

  async function getTokenStats({ address }) {
    const [balance, staked, fromExtraView] = await Promise.all([
      getBalance({ address }),
      _getStakedTokens({ address }),
      _getTokensStatsFromExtraView({ address }),
    ]);

    const { locked, stakedPlusPending } = fromExtraView;

    const pendingStake = stakedPlusPending.sub(staked);
    const mixinFromView = pendingStake.eq(ZERO) ? { locked } : { pendingStake, locked };

    return {
      balance,
      staked,
      ...mixinFromView,
      available: _getAvailableTokens({
        balance,
        locked,
        staked,
      }),
    };
  }

  async function _getStakedTokens({ address }) {
    const juror = await klerosLiquid.methods.jurors(address).call();

    return toBN(juror.stakedTokens);
  }

  async function _getTokensStatsFromExtraView({ address }) {
    const { lockedTokens, stakedTokens } = await klerosLiquidExtraViews.methods.getJuror(address).call();
    return {
      locked: toBN(lockedTokens),
      stakedPlusPending: toBN(stakedTokens),
    };
  }

  /**
   * Jurors are allowed to unstake all tokens, even if some of them are locked because of ongoing disputes.
   * To get the amount available to be bridged, we take the minimum between the difference between the jurors balance
   * and their locked tokens and the difference between the balance and their staked tokens.
   * Also there might be a case when the amount of staked tokens of a juror is lower than their balance. In this case,
   * we simply return zero.
   */
  function _getAvailableTokens({ balance, locked, staked }) {
    const available = BN.min(balance.sub(locked), balance.sub(staked));
    return available.lt(ZERO) ? ZERO : available;
  }

  async function _getFee({ amount }) {
    amount = toBN(amount);

    const feeType = await tokenBridge.methods.HOME_TO_FOREIGN_FEE().call();
    /**
     * The token that will actually be bridged is the raw PNK on xDAI.
     */
    const token = xPinakion.options.address;
    return toBN(await tokenBridge.methods.calculateFee(feeType, token, amount).call());
  }

  async function getRelayedAmount({ originalAmount }) {
    return toBN(originalAmount).sub(await _getFee({ amount: originalAmount }));
  }

  const BASIS_POINTS_MULTIPLIER = toBN("10000");

  async function getFeeRatio() {
    const relayedAmount = toBN(toWei("1"));
    const fee = await _getFee({ amount: relayedAmount });

    const ratioBasisPoints = fee.mul(BASIS_POINTS_MULTIPLIER).div(relayedAmount);

    return ratioBasisPoints.toNumber() / BASIS_POINTS_MULTIPLIER.toNumber();
  }

  async function getRequiredAmount({ desiredAmount }) {
    desiredAmount = toBN(desiredAmount);

    if (desiredAmount.isZero()) {
      return toBN("0");
    }

    const fee = await _getFee({ amount: desiredAmount });
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

    const [balance, allowance] = await Promise.all([getRawBalance({ address }), _getRawAllowance({ address })]);

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

  async function _getRawAllowance({ address }) {
    return toBN(await xPinakion.methods.allowance(address, wrappedPinakion.options.address).call());
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
    destinationChainId,
    getBalance,
    getRawBalance,
    getTokenStats,
    getFeeRatio,
    getRelayedAmount,
    getRequiredAmount,
    deposit,
    withdraw,
  };
}
