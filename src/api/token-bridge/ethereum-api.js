import Web3 from "web3";
import createError from "../../helpers/create-error";
import { promiEventToAsyncGenerator } from "../../helpers/transactions";

const { toBN, padLeft } = Web3.utils;

export function createReadOnlyApi({ chainId, tokenBridge, pinakion, klerosLiquidExtraViews }) {
  async function getBalance({ address }) {
    return toBN(await pinakion.methods.balanceOf(address).call());
  }

  async function getStake({ address, subcourtId = "0" }) {
    return toBN(await klerosLiquidExtraViews.methods.stakeOf(address, subcourtId).call());
  }

  async function getAllowance({ address }) {
    return toBN(await pinakion.methods.allowance(address, tokenBridge.options.address).call());
  }

  async function getFee({ amount: ignored }) {
    return toBN("0");
  }

  async function getRelayedAmount({ originalAmount }) {
    return toBN(originalAmount);
  }

  async function getRequiredAmount({ desiredAmount }) {
    return toBN(desiredAmount);
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

export function createFullApi({ chainId, tokenBridge, pinakion, klerosLiquidExtraViews, wrappedPinakionAddress }) {
  const readOnlyApi = createReadOnlyApi({
    chainId,
    tokenBridge,
    pinakion,
    klerosLiquidExtraViews,
    wrappedPinakionAddress,
  });
  const { getBalance, getAllowance } = readOnlyApi;

  async function* relayTokens({ address, amount }) {
    amount = toBN(amount);

    const [balance, allowance] = await Promise.all([getBalance({ address }), getAllowance({ address })]);

    if (balance.lt(amount)) {
      throw createError("Amount is greater than balance");
    }

    const buffer = {
      approve: { state: "none" },
      relay: { state: "none" },
    };

    // Only call approve if there is not enough allowance for the bridge to spend tokens
    if (allowance.lt(amount)) {
      yield { ...buffer };
      try {
        for await (const approve of promiEventToAsyncGenerator(
          pinakion.methods.approve(tokenBridge.options.address, amount).send({ from: address })
        )) {
          buffer.approve = approve;

          yield { ...buffer, approve };
        }
      } catch (err) {
        throw createError("Failed to approve PNK spend", err);
      }
    } else {
      buffer.approve = { state: "skipped" };
      yield { ...buffer };
    }

    const token = pinakion.options.address;
    const receiver = wrappedPinakionAddress;
    const value = amount;
    const data = addressToBytes32(address);

    try {
      for await (const relay of promiEventToAsyncGenerator(
        tokenBridge.methods.relayTokensAndCall(token, receiver, value, data).send({ from: address })
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

function addressToBytes32(address) {
  // 32 bytes can be represented as 64 char hex strings.
  return padLeft(address, 64);
}
