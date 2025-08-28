let hasRequestedEip6963Announcements = false;
const discoveredWalletIDs = new Set();
const eip6963WalletsCache = [];

function onAnnounce(event) {
  const { info, provider } = event.detail;
  const id = info.uuid || info.name;

  //Ignore duplicates and rainbow.
  //Rainbow extension seems to inject a provider shim that still relies on chrome.runtime.sendMessage().
  //When this shim runs in a web page, the call is made without an extension ID, so Chrome
  //repeatedly throws "runtime.sendMessage..." errors and keeps sending GET requests to chrome-extension://invalid/.
  //The result is errors flooding the console. Functionally Rainbow works (you can sign and send txs) but the spam is unacceptable.
  if (discoveredWalletIDs.has(id) || info.name.includes("Rainbow")) return;
  discoveredWalletIDs.add(id);

  eip6963WalletsCache.push({
    type: info.name.toLowerCase(),
    name: info.name,
    icon: info.icon,
    provider: provider,
  });
}

//Call syncronously to check cached wallet list
export function detectWallets() {
  if (typeof window === "undefined") return [];

  if (!hasRequestedEip6963Announcements) {
    //Listen for eip6963:announceProvider events
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    //Give wallets ~100 ms to respond, then detach listener.
    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
    }, 100);

    //Regardless of the caller, we no longer care for these events.
    hasRequestedEip6963Announcements = true;
  }

  return eip6963WalletsCache;
}

//Await the first announcement window (≈100 ms + margin).
//However, if cache exists, we resolve instantly.
export function detectWalletsAsync({ timeoutMs = 300 } = {}) {
  //Check cache and trigger wallet search (if not yet done)
  const initial = detectWallets();

  //Cache already populated → return immediately.
  if (initial.length > 0) {
    return Promise.resolve(initial);
  }

  //Otherwise wait a little longer than the 100 ms window and read the cache again.
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(detectWallets());
    }, timeoutMs);
  });
}

const STORAGE_KEY_LAST_WALLET_TYPE = "court-v1-last-wallet-connected";

export function getLastConnectedWalletProvider() {
  const wallets = detectWallets();

  if (wallets.length === 0) {
    return null;
  }

  let lastWalletType = window?.localStorage?.getItem(STORAGE_KEY_LAST_WALLET_TYPE) ?? undefined;

  if (lastWalletType) {
    const lastWallet = wallets.find((w) => w.type === lastWalletType);
    if (lastWallet) {
      return lastWallet.provider;
    }
  }

  //Fallback
  return wallets[0].provider;
}

//Connect to a specific wallet
export async function connectWallet(walletType) {
  const wallets = detectWallets();
  const wallet = wallets.find((w) => w.type === walletType);

  if (!wallet) {
    throw new Error(`Wallet ${walletType} not available`);
  }

  try {
    await wallet.provider.request({
      method: "eth_requestAccounts",
    });

    //eslint-disable-next-line no-unused-expressions
    window?.localStorage?.setItem(STORAGE_KEY_LAST_WALLET_TYPE, wallet.type);

    return wallet.provider;
  } catch (error) {
    throw new Error(`Failed to connect to ${wallet.name}: ${error.message}`);
  }
}
