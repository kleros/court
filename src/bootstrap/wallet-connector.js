let hasRequestedEip6963Announcements = false;
const discoveredWalletIDs = new Set();
const eip6963WalletsCache = [];

function onAnnounce(event) {
  const detail = event?.detail || {};
  const info = detail.info;
  const provider = detail.provider;

  if (!info || !provider) return;

  const walletId = (info.rdns || info.name || "").toLowerCase();

  //Ignore duplicates and rainbow.
  //Rainbow extension seems to inject a provider shim that still relies on chrome.runtime.sendMessage().
  //When this shim runs in a web page, the call is made without an extension ID, so Chrome
  //repeatedly throws "runtime.sendMessage..." errors and keeps sending GET requests to chrome-extension://invalid/.
  //The result is errors flooding the console. Functionally Rainbow works (you can sign and send txs) but the spam is unacceptable.
  const isRainbow = info.rdns?.toLowerCase() === "me.rainbow" || info.name?.toLowerCase().includes("rainbow");

  if (discoveredWalletIDs.has(walletId) || isRainbow) return;
  discoveredWalletIDs.add(walletId);

  eip6963WalletsCache.push({
    id: walletId,
    type: (info.name || "").toLowerCase(),
    name: info.name,
    icon: info.icon,
    provider,
  });
}

//Call synchronously to check cached wallet list and trigger a new discovery.
export function detectWallets() {
  if (typeof window === "undefined") return [];

  if (!hasRequestedEip6963Announcements) {
    //Keep it attached during page lifetimeto catch late providers.
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    hasRequestedEip6963Announcements = true;
  }
  //Request on every call so newly-installed wallets can announce.
  window.dispatchEvent(new Event("eip6963:requestProvider"));

  return [...eip6963WalletsCache];
}

//If we already have at least one wallet cached, resolve immediately.
//Otherwise wait a short time to give extensions a chance to announce.
export function detectWalletsAsync({ timeoutMs = 150 } = {}) {
  //Check cache and trigger wallet search (if not yet done)
  const initial = detectWallets();

  //Cache already populated → return immediately.
  if (initial.length > 0) {
    return Promise.resolve(initial);
  }

  //Otherwise wait a short time.
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(detectWallets());
    }, timeoutMs);
  });
}

const STORAGE_KEY_LAST_WALLET_ID = "@kleros/court-v1/last-wallet-connected";

export function getLastConnectedWalletProvider() {
  const wallets = detectWallets();

  if (wallets.length === 0) {
    return null;
  }

  const lastStored =
    typeof window !== "undefined" && window.localStorage
      ? window.localStorage.getItem(STORAGE_KEY_LAST_WALLET_ID)
      : undefined;

  if (lastStored) {
    const lastWallet = wallets.find((w) => w.id === lastStored);
    if (lastWallet) {
      return lastWallet.provider;
    }
  }

  //Fallback
  return wallets[0].provider;
}

//Connect to a specific wallet
export async function connectWallet(walletId) {
  const wallets = detectWallets();
  const wallet = wallets.find((w) => w.id === walletId);

  if (!wallet) {
    throw new Error(`Wallet ${walletId} not available`);
  }

  try {
    //Prefer EIP-1193 request, fallback to legacy enable if present.
    if (typeof wallet.provider?.request === "function") {
      await wallet.provider.request({ method: "eth_requestAccounts" });
    } else if (typeof wallet.provider?.enable === "function") {
      await wallet.provider.enable();
    } else {
      throw new Error("Provider does not implement a connection method");
    }

    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY_LAST_WALLET_ID, wallet.id);
    }

    return wallet.provider;
  } catch (error) {
    const message = error && typeof error === "object" && "message" in error ? error.message : String(error);
    throw new Error(`Failed to connect to ${wallet.name}: ${message}`);
  }
}
