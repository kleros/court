import web3DeriveAccount from "../temp/web3-derive-account";
import axios from "axios";

export const API = async ({ url, method, createDerived, web3, account: address, payload, payloadName }) => {
  const derivedAccount = await web3DeriveAccount(web3, address, createDerived);

  console;
  const chainId = await web3.eth.getChainId();

  const signature = derivedAccount?.sign(JSON.stringify(payload)).signature;

  try {
    const res = await axios[method.toLowerCase()](url, {
      payload: { address, chainId, signature, [payloadName]: payload },
    });
    return res.data;
  } catch (err) {
    console.error(err.message);

    if (!derivedAccount) return { error: "An unexpected error occurred." };
  }

  try {
    const settings = { derivedAccountAddress: { S: derivedAccount.address } };
    await axios.patch(process.env.REACT_APP_USER_SETTINGS_URL, {
      payload: { address, settings, signature: await web3.eth.personal.sign(JSON.stringify(settings), address) },
    });
    return (
      await axios[method.toLocaleLowerCase()](url, {
        payload: { address, chainId, signature, [payloadName]: payload },
      })
    ).data;
  } catch (err) {
    console.error(err.message);
    return { error: "An unexpected error occurred." };
  }
};
