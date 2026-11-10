export default async function web3Salt(web3, account, key, ...args) {
  const storageKey = `${account}-${key}`;
  let secret = localStorage.getItem(storageKey);

  if (secret === null) {
    secret = await cachedSignRequest(web3, key, account);
    localStorage.setItem(storageKey, secret);
  }

  return web3.utils.soliditySha3(secret, ...args);
}

const signatureRequestCache = {};

/**
 * Components that call the function above are usually big and will re-render for various reasons.
 * Since we don't have the time to properly refactor them, this is a workaround so ensure that we
 * won't spam jurors with multiple signature requests for the same message.
 */
const cachedSignRequest = async (web3, key, account) => {
  if (!signatureRequestCache[key]) {
    signatureRequestCache[key] = web3.eth.personal.sign(key, account);
  }

  const result = await signatureRequestCache[key];
  delete signatureRequestCache[key];

  return result;
};
