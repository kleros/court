import web3DeriveAccount from "../temp/web3-derive-account";
import axios from "axios";

const chainIdToNetwork = {
  1: "mainnet",
  5: "goerli",
  100: "xdai",
  11155111: "sepolia",
};

export const API = async ({ url, method, createDerived, web3, account, payload }) => {
  try {
    const derivedAccount = await web3DeriveAccount(
      web3,
      account,
      "To keep your data safe and to use certain features of Kleros, we ask that you sign these messages to create a secret key for your account. This key is unrelated from your main Ethereum account and will not be able to send any transactions.",
      createDerived
    );
    const chainId = await web3.eth.getChainId();
    const network = chainIdToNetwork[chainId] === "main" ? "mainnet" : chainIdToNetwork[chainId];
    if (!payload) payload["network"] = network;

    const signature = derivedAccount?.sign(JSON.stringify(payload)).signature;

    const res = await axios[method.toLowerCase()](url, {
      payload: { address: account, network, signature, ...payload },
    });

    if (res.ok || !derivedAccount) return res;

    const settings = { derivedAccountAddress: { S: derivedAccount.address } };
    await axios.patch(process.env.REACT_APP_USER_SETTINGS_URL, {
      payload: {
        address: account,
        settings,
        signature: await web3.eth.personal.sign(JSON.stringify(settings), account),
      },
    });
    return await axios[method.toLocaleLowerCase()](url, {
      payload: { address: account, network, signature, ...payload },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred." };
  }
};
