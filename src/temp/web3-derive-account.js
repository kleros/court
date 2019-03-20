export default async (web3, account, key) => {
  const storageKey = `${account}-${key}`
  let secret = localStorage.getItem(storageKey)
  if (secret === null) {
    secret = await web3.eth.personal.sign(key, account)
    localStorage.setItem(storageKey, secret)
  }
  return web3.eth.accounts.privateKeyToAccount(web3.utils.keccak256(secret))
}
