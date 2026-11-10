import { Tokens } from "./chain-params";

export default function createWatchToken({ getChainParams }) {
  return async function requestWatchToken(provider, token) {
    if (![Tokens.stPNK, Tokens.PNK].includes(token)) {
      throw new Error(`Invalid token: ${token}`);
    }

    const chainId = Number.parseInt(
      await provider.request({
        method: "eth_chainId",
      }),
      16
    );

    const tokenParams = getChainParams(chainId)?.tokens ?? {};
    const tokenData = tokenParams[token];

    if (!tokenData || isAssetWatched({ ...tokenData, chainId })) {
      return;
    }

    // Store BEFORE calling addToken - if user refreshes during wallet popup,
    // we don't want to prompt again
    storeWatchedAsset({ ...tokenData, chainId });

    try {
      await addToken(provider, tokenData);
    } catch (err) {
      console.warn(`Error when adding token ${token}:`, err);
    }
  };
}

async function addToken(provider, { address, symbol, decimals = 18, image }) {
  /**
   * FIXME: Apparently this call is broken and the promise will resolve even if the user
   * rejects the request to watch the asset.
   *
   * @see { @link https://github.com/MetaMask/metamask-extension/issues/11377 }
   */
  return await provider.request({
    method: "wallet_watchAsset",
    params: {
      type: "ERC20",
      options: {
        address,
        symbol,
        decimals,
        image,
      },
    },
  });
}

const getStorageKey = ({ chainId, symbol, address }) => `@@kleros/court/tokens/${symbol}/${chainId}/${address}`;

function isAssetWatched({ chainId, symbol, address }) {
  const key = getStorageKey({ chainId, symbol, address });

  try {
    return JSON.parse(window.localStorage.getItem(key)) === true;
  } catch (err) {
    console.warn("Error in isAssetWatched", err);
    return false;
  }
}

function storeWatchedAsset({ chainId, symbol, address }) {
  const key = getStorageKey({ chainId, symbol, address });

  try {
    window.localStorage.setItem(key, "true");
  } catch (err) {
    console.warn("Error in isAssetWatched", err);
  }
}
