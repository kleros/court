import web3DeriveAccount from "../temp/web3-derive-account";
import axios from "axios";

const chainIdToNetwork = {
  1: "mainnet",
  5: "goerli",
  100: "xdai",
};

export const API = async ({ url, method, createDerived, web3, account, payload }) => {
  let derivedAccount;
  derivedAccount = await web3DeriveAccount(
    web3,
    account,
    "To keep your data safe and to use certain features of Kleros, we ask that you sign these messages to create a secret key for your account. This key is unrelated from your main Ethereum account and will not be able to send any transactions.",
    createDerived
  );

  const network = chainIdToNetwork[await web3.eth.getChainId()];
  if (!payload) payload["network"] = network === "main" ? "mainnet" : network;

  const signature = derivedAccount
    ? derivedAccount.sign(JSON.stringify(payload)).signature
    : await web3.eth.sign(JSON.stringify(payload), account);

  const func = () =>
    axios[method.toLocaleLowerCase()](url, {
      payload: {
        address: account,
        network: network === "main" ? "mainnet" : network,
        signature,
        ...payload,
      },
    });

  const res = func();

  if (!res.ok && derivedAccount) {
    const settings = { derivedAccountAddress: { S: derivedAccount.address } };
    await axios.patch(process.env.REACT_APP_USER_SETTINGS_URL, {
      payload: {
        address: account,
        settings,
        signature: await web3.eth.personal.sign(JSON.stringify(settings), account),
      },
    });

    return func();
  }

  return res;
};
