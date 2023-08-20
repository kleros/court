import axios from "axios";
import web3DeriveAccount from "../temp/web3-derive-account";

export const accessSettings = async ({ patch, web3, address, settings }) => {
  const derived = await web3DeriveAccount(web3, address, patch);
  try {
    if (!derived) {
      if (!patch) throw new Error("No derived account stored.");

      return (
        await axios.patch(process.env.REACT_APP_USER_SETTINGS_URL, {
          payload: {
            address,
            settings,
            signature: await web3.eth.personal.sign(JSON.stringify(settings), address),
          },
        })
      ).data;
    }

    try {
      return (
        await axios[patch ? "patch" : "post"](process.env.REACT_APP_USER_SETTINGS_URL, {
          payload: {
            address,
            settings,
            signature: derived.sign(JSON.stringify(settings)).signature,
          },
        })
      ).data;
    } catch (err) {
      if (!patch) throw new Error("No derived account stored.");

      const settingsWithDerived = { ...settings, derivedAccountAddress: { S: derived.address } };
      return (
        await axios.patch(process.env.REACT_APP_USER_SETTINGS_URL, {
          payload: {
            address,
            settings: settingsWithDerived,
            signature: await web3.eth.personal.sign(JSON.stringify(settingsWithDerived), address),
          },
        })
      ).data;
    }
  } catch (err) {
    console.error(err.message);
    return { error: "An unexpected error occurred." };
  }
};

export const postJustification = async ({ web3, account, justification }) => {
  const derived = await web3DeriveAccount(web3, account, true);
  try {
    await axios.post(`${process.env.REACT_APP_JUSTIFICATIONS_URL}/put-justification`, {
      account,
      chainId: await web3.eth.getChainId(),
      justification,
      signature: derived
        ? derived.sign(JSON.stringify(justification)).signature
        : await web3.eth.personal.sign(JSON.stringify(justification), account),
    });
  } catch (err) {
    if (derived) {
      await axios.post(`${process.env.REACT_APP_JUSTIFICATIONS_URL}/put-justification`, {
        account,
        chainId: await web3.eth.getChainId(),
        derived: derived.address,
        derivedSignature: await web3.eth.personal.sign(
          `Sign this to confirm derived account address ${derived.address}. This will be used to provide justifications.`,
          account
        ),
        justification,
        signature: derived.sign(JSON.stringify(justification)).signature,
      });
      return;
    }

    console.error(err.message);
  }
};
