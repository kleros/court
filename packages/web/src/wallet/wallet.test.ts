import { describe, expect, it } from "vitest";
import { readEnv } from "@court/core";
import { APPKIT_FEATURES, customRpcUrls } from "./appkitOptions";
import { initWallet } from "./init";
import { createReadClient } from "./readClients";

const RPC = "https://mainnet.rpc.example/key";

describe("no Reown project id", () => {
  it("is read-only: no connectors, no wallet discovery, AppKit never loaded", async () => {
    const wallet = await initWallet(readEnv({}), "https://court.example");
    expect(wallet.canConnect).toBe(false);
    expect(wallet.config.connectors).toHaveLength(0);
  });

  it("an unconfigured chain fails instead of falling back to any public or Reown RPC", async () => {
    const client = createReadClient(readEnv({}), 100);
    await expect(client.getBlockNumber()).rejects.toThrow(/No read RPC configured for chain 100/);
  });
});

describe("AppKit options", () => {
  it("turns off email, socials, swaps, onramp, send, history and analytics", () => {
    expect(APPKIT_FEATURES).toEqual({
      analytics: false,
      email: false,
      socials: [],
      swaps: false,
      onramp: false,
      send: false,
      history: false,
    });
  });

  it("puts our RPC first for configured chains only", () => {
    expect(customRpcUrls(readEnv({ REACT_APP_WEB3_FALLBACK_HTTPS_URL: RPC }))).toEqual({ "eip155:1": [{ url: RPC }] });
  });

  it("the adapter's wagmi config uses only our transports", async () => {
    const { createWagmiAdapter } = await import("./appkit");
    const adapter = createWagmiAdapter("test-project-id", readEnv({ REACT_APP_WEB3_FALLBACK_HTTPS_URL: RPC }));
    // Every Court chain: exactly our transport, no Reown fallback (yarn patch on @reown/appkit-utils 1.8.24).
    for (const chainId of [1, 100, 11155111, 10200] as const) {
      const transport = adapter.wagmiConfig.getClient({ chainId }).transport as { type: string; url?: string };
      expect(transport.type, `chain ${String(chainId)}`).not.toBe("fallback");
    }
    const mainnet = adapter.wagmiConfig.getClient({ chainId: 1 }).transport as { type: string; url?: string };
    expect(mainnet.type).toBe("http");
    expect(mainnet.url).toBe(RPC);
  });
});
