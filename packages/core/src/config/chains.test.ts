import { describe, expect, it } from "vitest";
import {
  CHAIN_INFO,
  COURT_CHAIN_ID_LIST,
  addChainParameters,
  explorerAddressUrl,
  explorerTxUrl,
  readEnv,
} from "./index.ts";

describe("chain names (spec 01.8, 01.16)", () => {
  it.each([
    [1, "Ethereum Mainnet", "Mainnet"],
    [100, "Gnosis Chain", "Gnosis Chain"],
    [10200, "Gnosis Testnet Chiado", "Chiado"],
    [11155111, "Ethereum Testnet Sepolia", "Sepolia"],
  ] as const)("chain %i is %s, short name %s, as today", (id, name, shortName) => {
    expect(CHAIN_INFO[id].name).toBe(name);
    expect(CHAIN_INFO[id].shortName).toBe(shortName);
  });

  it("describes exactly the four court chains", () => {
    expect(
      Object.keys(CHAIN_INFO)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([...COURT_CHAIN_ID_LIST].sort((a, b) => a - b));
  });
});

describe("symbols (spec 08.11, P28)", () => {
  it.each([
    [1, "ETH"],
    [100, "xDAI"],
    [10200, "xDAI"],
    [11155111, "sETH"],
  ] as const)("chain %i pays fees in %s, as today", (id, symbol) => {
    expect(CHAIN_INFO[id].nativeSymbol).toBe(symbol);
  });

  it("staked PNK is PNK on Mainnet and Sepolia, stPNK on Gnosis and Chiado", () => {
    expect(CHAIN_INFO[1].stakedSymbol).toBe("PNK");
    expect(CHAIN_INFO[11155111].stakedSymbol).toBe("PNK");
    expect(CHAIN_INFO[100].stakedSymbol).toBe("stPNK");
    expect(CHAIN_INFO[10200].stakedSymbol).toBe("stPNK");
  });

  it("bridged PNK is called xPNK, never plain PNK, and exists only on Gnosis and Chiado", () => {
    expect(CHAIN_INFO[100].bridgedSymbol).toBe("xPNK");
    expect(CHAIN_INFO[10200].bridgedSymbol).toBe("xPNK");
    expect(CHAIN_INFO[1].bridgedSymbol).toBeNull();
    expect(CHAIN_INFO[11155111].bridgedSymbol).toBeNull();
  });
});

describe("test networks (P60)", () => {
  it("Mainnet and Gnosis are the production chains; Sepolia and Chiado are test networks", () => {
    expect(CHAIN_INFO[1].testnet).toBe(false);
    expect(CHAIN_INFO[100].testnet).toBe(false);
    expect(CHAIN_INFO[11155111].testnet).toBe(true);
    expect(CHAIN_INFO[10200].testnet).toBe(true);
  });
});

describe("explorer links (spec 01.16)", () => {
  const address = "0x988B3A538b618C7A603e1c11Ab82Cd16dbE28069";
  const hash = "0x8bd5945400000000000000000000000000000000000000000000000000081b9";

  it.each([
    [1, "https://etherscan.io"],
    [100, "https://gnosis.blockscout.com"],
    [10200, "https://blockscout.chiadochain.net"],
    [11155111, "https://sepolia.etherscan.io"],
    [137, "https://etherscan.io"],
    [42161, "https://etherscan.io"],
  ])("chain %i links to %s (any other chain: etherscan.io)", (id, base) => {
    expect(explorerAddressUrl(id, address)).toBe(`${base}/address/${address}`);
    expect(explorerTxUrl(id, hash)).toBe(`${base}/tx/${hash}`);
  });
});

describe("adding Gnosis to a wallet that lacks it (spec 05.10, P19, P53)", () => {
  it("sends today's name, currency and explorer with Gnosis's public RPC", () => {
    expect(addChainParameters(100)).toEqual({
      chainId: "0x64",
      chainName: "Gnosis Chain",
      nativeCurrency: { name: "xDAI", symbol: "xDAI", decimals: 18 },
      rpcUrls: ["https://rpc.gnosischain.com"],
      blockExplorerUrls: ["https://gnosis.blockscout.com"],
    });
  });

  it("never writes the app's own Gnosis read RPC into the wallet", () => {
    const keyed = "https://gnosis.example/v2/KEY";
    const env = readEnv({ REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL: keyed });
    expect(env.rpcUrls[100]).toBe(keyed);
    expect(JSON.stringify(addChainParameters(100))).not.toContain("gnosis.example");
  });

  it("adds only Gnosis: any other chain has no parameters", () => {
    for (const id of [1, 10200, 11155111, 137]) expect(addChainParameters(id)).toBeNull();
  });
});
