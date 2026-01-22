import axios from "axios";
import web3DeriveAccount from "../temp/web3-derive-account";

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
