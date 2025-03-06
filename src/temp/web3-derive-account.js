export const derivedAccountKey =
  "To keep your data safe and to use certain features of Kleros, we ask that you sign these messages to create a secret key for your account. This key is unrelated from your main Ethereum account and will not be able to send any transactions.";

export default async (web3, account, create = false) => {
  const storageKey = `${account}-${derivedAccountKey}`;
  let secret = localStorage.getItem(storageKey);

  if (secret === null) {
    if (!create) return null;

    secret = await web3.eth.personal.sign(derivedAccountKey, account);
    localStorage.setItem(storageKey, secret);
  }

  return web3.eth.accounts.privateKeyToAccount(web3.utils.keccak256(secret));
};
