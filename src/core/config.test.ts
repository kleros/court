// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  chainName,
  chainShortName,
  courtChainIds,
  explorerAddressUrl,
  explorerTransactionUrl,
  isCourtChainId,
} from "./chains.ts";
import { readClient } from "./client.ts";
import { contractAddress, readRpcUrl, type CourtConfig } from "./config.ts";
import { rpcFixture } from "./testing/rpc-fixture.ts";

describe("readRpcUrl", () => {
  const config: CourtConfig = { rpcUrls: { 1: "http://rpc.invalid/1", 100: "" }, contracts: {} };
  it("returns the configured URL", () => {
    expect(readRpcUrl(config, 1)).toBe("http://rpc.invalid/1");
  });
  it("throws master's message for a missing or empty setting", () => {
    expect(() => readRpcUrl(config, 100)).toThrow(new Error("Unsupported chain ID: 100"));
    expect(() => readRpcUrl(config, 10200)).toThrow(new Error("Unsupported chain ID: 10200"));
  });
});

describe("contractAddress", () => {
  const config: CourtConfig = {
    rpcUrls: {},
    contracts: { 1: { klerosLiquid: "0x1000000000000000000000000000000000000001", pinakion: "0x1234" } },
  };
  it("returns a configured address", () => {
    expect(contractAddress(config, 1, "klerosLiquid")).toBe("0x1000000000000000000000000000000000000001");
  });
  it("throws for a missing or malformed address", () => {
    expect(() => contractAddress(config, 1, "policyRegistry")).toThrow(
      "No policyRegistry address configured for chain 1",
    );
    expect(() => contractAddress(config, 100, "klerosLiquid")).toThrow(
      "No klerosLiquid address configured for chain 100",
    );
    expect(() => contractAddress(config, 1, "pinakion")).toThrow("The pinakion address for chain 1 is not an address");
  });
});

describe("readClient", () => {
  it("builds no transport for a chain without a read RPC", () => {
    const transport = vi.fn(rpcFixture([]).transport);
    const config: CourtConfig = { rpcUrls: {}, contracts: {}, transport };
    expect(() => readClient(config, 1)).toThrow("Unsupported chain ID: 1");
    expect(transport).not.toHaveBeenCalled();
  });
  it("uses viem's http transport on the configured URL when no transport is given (the app's path)", () => {
    const client = readClient({ rpcUrls: { 1: "http://rpc.invalid/1" }, contracts: {} }, 1);
    expect(client.transport.type).toBe("http");
    expect(client.transport.url).toBe("http://rpc.invalid/1");
  });
  it("keeps one client per config and chain", () => {
    const transport = vi.fn(rpcFixture([]).transport);
    const config: CourtConfig = {
      rpcUrls: { 1: "http://rpc.invalid/1", 100: "http://rpc.invalid/100" },
      contracts: {},
      transport,
    };
    expect(readClient(config, 1)).toBe(readClient(config, 1));
    expect(readClient(config, 100)).not.toBe(readClient(config, 1));
    expect(transport.mock.calls).toEqual([
      ["http://rpc.invalid/1", 1],
      ["http://rpc.invalid/100", 100],
    ]);
    expect(readClient({ ...config }, 1)).not.toBe(readClient(config, 1));
  });
});

describe("chains", () => {
  it("are master's four chains with master's names", () => {
    expect(courtChainIds).toEqual([1, 100, 10200, 11155111]);
    expect(courtChainIds.map(chainName)).toEqual([
      "Ethereum Mainnet",
      "Gnosis Chain",
      "Gnosis Testnet Chiado",
      "Ethereum Testnet Sepolia",
    ]);
    expect(courtChainIds.map(chainShortName)).toEqual(["Mainnet", "Gnosis Chain", "Chiado", "Sepolia"]);
    expect(isCourtChainId(100)).toBe(true);
    expect(isCourtChainId(137)).toBe(false);
  });
  it("link to master's explorers, Etherscan for any other chain", () => {
    expect(explorerTransactionUrl(1, "0xab")).toBe("https://etherscan.io/tx/0xab");
    expect(explorerTransactionUrl(100, "0xab")).toBe("https://gnosis.blockscout.com/tx/0xab");
    expect(explorerAddressUrl(10200, "0xcd")).toBe("https://blockscout.chiadochain.net/address/0xcd");
    expect(explorerAddressUrl(11155111, "0xcd")).toBe("https://sepolia.etherscan.io/address/0xcd");
    expect(explorerAddressUrl(137, "0xcd")).toBe("https://etherscan.io/address/0xcd");
  });
});
