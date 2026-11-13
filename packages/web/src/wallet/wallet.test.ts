import { describe, expect, it, onTestFinished, vi } from "vitest";
import type { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { OptionsController } from "@reown/appkit-controllers";
import { custom, encodeErrorResult, offchainLookupAbiItem } from "viem";
import { mainnet } from "viem/chains";
// eslint-disable-next-line no-restricted-imports -- wagmi's own Connect, Disconnect and restore on load, as AppKit calls them; no chain read
import { connect, disconnect, reconnect } from "@wagmi/core";
import { createConfig, deserialize, injected, mock } from "wagmi";
import { readEnv } from "@court/core";
import { APPKIT_FEATURES, customRpcUrls } from "./appkitOptions";
import { initWallet, readOnlyWagmiConfig } from "./init";
import { createReadClient } from "./readClients";
import { walletStorage } from "./walletStorage";

const RPC = "https://mainnet.rpc.example/key";

describe("no Reown project id", () => {
  it("is read-only: no connectors, no wallet discovery, AppKit never loaded", async () => {
    const wallet = await initWallet(readEnv({}), "https://court.example");
    expect(wallet.modal).toBeNull();
    expect(wallet.config.connectors).toHaveLength(0);
  });

  it("an unconfigured chain fails instead of falling back to any public or Reown RPC", async () => {
    const client = createReadClient(readEnv({}), 100);
    await expect(client.getBlockNumber()).rejects.toThrow(/No read RPC configured for chain 100/);
  });

  it("the read client never follows a contract's offchain lookup: only the read RPC is fetched", async () => {
    // The called contract names the URLs; viem would fetch them with the global fetch and no timeout.
    const contract = "0x00000000000000000000000000000000000000aa";
    const lookup = encodeErrorResult({
      abi: [offchainLookupAbiItem],
      errorName: "OffchainLookup",
      args: [contract, ["https://creator.example/{sender}/{data}.json"], "0x1234", "0x12345678", "0x"],
    });
    const fetched: string[] = [];
    vi.stubGlobal("fetch", (input: unknown, init?: { body?: unknown }) => {
      fetched.push(String(input));
      if (input !== RPC) return Promise.reject(new TypeError("fetch failed"));
      const { id } = JSON.parse(String(init?.body)) as { id: number };
      const error = { code: 3, message: "execution reverted", data: lookup };
      return Promise.resolve(Response.json({ jsonrpc: "2.0", id, error }));
    });
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });
    const client = createReadClient(readEnv({ REACT_APP_WEB3_FALLBACK_HTTPS_URL: RPC }), 1);
    await expect(client.call({ to: contract, data: "0x12345678" })).rejects.toThrow(/reverted/);
    expect(fetched).toEqual([RPC]);
  });

  it("wagmi's clients never follow a contract's offchain lookup either", () => {
    const config = readOnlyWagmiConfig(readEnv({}));
    expect(config.getClient({ chainId: 1 }).ccipRead).toBe(false);
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
    // A chain with no read RPC configured keeps a transport that fails, even though its wagmi chain lists a public RPC.
    const gnosis = adapter.wagmiConfig.getClient({ chainId: 100 }).transport as { type: string; url?: string };
    expect(gnosis.type).toBe("custom");
    // Its clients never follow a contract's offchain lookup either.
    expect(adapter.wagmiConfig.getClient({ chainId: 1 }).ccipRead).toBe(false);
  });

  it("the adapter never adds the Base Account connector (its SDK injects an inline script: D-03)", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("unit tests make no network requests")));
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });
    const { createWagmiAdapter } = await import("./appkit");
    const adapter = createWagmiAdapter("test-project-id", readEnv({}));
    // What createAppKit sets from our options before it syncs the adapter's connectors (appkit-base-client.js:213-214,
    // :423, :439).
    OptionsController.setEnableCoinbase(false);
    OptionsController.setFeatures(APPKIT_FEATURES);
    await adapter.syncConnectors();
    expect(adapter.wagmiConfig.connectors.map((c) => c.id)).toEqual(["injected"]);
  });
});

describe("wallet storage", () => {
  it("keeps wagmi's own keys and format, so a wallet that connected before is restored on load", async () => {
    window.localStorage.clear();
    const storage = walletStorage();
    await storage.setItem("recentConnectorId", "injected");
    expect(window.localStorage.getItem("wagmi.recentConnectorId")).toBe('"injected"');
    expect(await storage.getItem("recentConnectorId")).toBe("injected");
  });

  it("hands back the state wagmi stored for a connected wallet, unchanged", async () => {
    window.localStorage.clear();
    const account = "0x00000000000000000000000000000000000000A1";
    const config = createConfig({
      chains: [mainnet],
      connectors: [mock({ accounts: [account] })],
      storage: walletStorage(),
      transports: { [mainnet.id]: custom({ request: () => Promise.reject(new Error("no network")) }) },
    });
    const [connector] = config.connectors;
    if (connector === undefined) throw new Error("mock connector missing");
    // A wallet announcing its connection: wagmi's own handler records it and stores its state.
    connector.emitter.emit("connect", { accounts: [account], chainId: mainnet.id });
    const stored = window.localStorage.getItem("wagmi.store") ?? "";
    expect(stored).toContain(account);

    expect(await walletStorage().getItem("store")).toEqual(deserialize(stored));
    expect(window.localStorage.getItem("wagmi.store")).toBe(stored);
  });

  // Storage failures never take Connect away. Every EIP-6963 wallet is wagmi's injected connector (@wagmi/core
  // createConfig.js:64-67), which removes its "disconnected" mark before it returns the accounts (connectors/
  // injected.js:138-139), and wagmi then stores the last wallet's id before it counts the wallet connected
  // (actions/connect.js:22-34): a refused remove or write that reached wagmi failed the connection.
  it.each([
    [
      "full",
      () =>
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
          throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
        }),
    ],
    [
      "blocked",
      () =>
        vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
          throw new DOMException("Access is denied for this document.", "SecurityError");
        }),
    ],
  ])("a browser wallet connects with storage %s", async (_name, refuseStorage) => {
    window.localStorage.clear();
    const refusal = refuseStorage();
    onTestFinished(() => {
      refusal.mockRestore();
    });
    const config = browserWalletConfig("announced");
    await connect(config, { connector: onlyConnector(config) });
    expect(config.state.status).toBe("connected");
    expect([...config.state.connections.values()].map((c) => c.accounts)).toEqual([[WALLET_ACCOUNT]]);
    expect(refusal).toHaveBeenCalled();
  });

  // wagmi's marks for a browser wallet (@wagmi/core 2.22.1 connectors/injected.ts): `<connector id>.disconnected`, and
  // `injected.connected` for the browser's default wallet (the one with no target, which AppKit's adapter adds). It
  // writes `true` (:184-190 on Connect, :246-252 on Disconnect) and reads them on load inside a catch that counts any
  // error as "not authorized" (:289-303, :353-355).
  const DISCONNECTED = "io.test.mockwallet.disconnected";
  const CONNECTED = "injected.connected";
  const UNREADABLE_MARKS: [string, string][] = [
    ["not JSON", "{"],
    ["a bigint wagmi cannot read", '{"__type":"bigint","value":"x"}'],
    ["a number", "5"],
    ["an object", "{}"],
  ];

  it.each(UNREADABLE_MARKS)(
    "drops a stored disconnected mark that is %s: the wallet is restored on load",
    async (_name, text) => {
      window.localStorage.clear();
      window.localStorage.setItem(`wagmi.${DISCONNECTED}`, text);
      const config = browserWalletConfig("announced");
      await reconnect(config);
      expect(config.state.status).toBe("connected");
      expect(window.localStorage.getItem(`wagmi.${DISCONNECTED}`)).toBeNull();
    },
  );

  it("keeps the disconnected mark wagmi stores on Disconnect: no restore on load until the next Connect", async () => {
    window.localStorage.clear();
    const before = browserWalletConfig("announced");
    await connect(before, { connector: onlyConnector(before) });
    await disconnect(before);
    expect(window.localStorage.getItem(`wagmi.${DISCONNECTED}`)).toBe("true");

    const config = browserWalletConfig("announced");
    await reconnect(config);
    expect(config.state.status).toBe("disconnected");
    expect(window.localStorage.getItem(`wagmi.${DISCONNECTED}`)).toBe("true");
    await connect(config, { connector: onlyConnector(config) });
    expect(config.state.status).toBe("connected");
    expect(window.localStorage.getItem(`wagmi.${DISCONNECTED}`)).toBeNull();
  });

  // wagmi itself removes the mark instead of writing false; false, written with wagmi's own serializer, still reads
  // as "not disconnected".
  it("restores the wallet on load with a disconnected mark of false", async () => {
    window.localStorage.clear();
    await walletStorage().setItem(DISCONNECTED, false);
    expect(window.localStorage.getItem(`wagmi.${DISCONNECTED}`)).toBe("false");
    const config = browserWalletConfig("announced");
    await reconnect(config);
    expect(config.state.status).toBe("connected");
  });

  it.each(UNREADABLE_MARKS)(
    "drops a stored connected mark that is %s: the default wallet is not restored, as on a first visit",
    async (_name, text) => {
      window.localStorage.clear();
      window.localStorage.setItem(`wagmi.${CONNECTED}`, text);
      const config = browserWalletConfig("default");
      await reconnect(config);
      expect(config.state.status).toBe("disconnected");
      expect(window.localStorage.getItem(`wagmi.${CONNECTED}`)).toBeNull();
      await connect(config, { connector: onlyConnector(config) });
      expect(config.state.status).toBe("connected");
      expect(window.localStorage.getItem(`wagmi.${CONNECTED}`)).toBe("true");
    },
  );

  it.each([
    { name: "no connected mark (a first visit)", mark: null, status: "disconnected" },
    { name: "the connected mark wagmi stores on Connect", mark: true, status: "connected" },
    { name: "a connected mark of false", mark: false, status: "disconnected" },
  ])("on load with $name, the default wallet is $status", async ({ mark, status }) => {
    window.localStorage.clear();
    await walletStorage().setItem(CONNECTED, mark);
    const config = browserWalletConfig("default");
    await reconnect(config);
    expect(config.state.status).toBe(status);
  });

  it.each([DISCONNECTED, CONNECTED].flatMap((key) => [true, false].map((mark): [string, boolean] => [key, mark])))(
    "keeps a stored %s mark of %s",
    async (key, mark) => {
      window.localStorage.clear();
      window.localStorage.setItem(`wagmi.${key}`, String(mark));
      expect(await walletStorage().getItem(key)).toBe(mark);
      expect(window.localStorage.getItem(`wagmi.${key}`)).toBe(String(mark));
    },
  );

  // As wagmi stored them in a browser with an injected wallet (court-lab capture): connected on Ethereum, then on
  // Gnosis, then disconnected.
  it.each([
    [
      "store",
      '{"state":{"connections":{"__type":"Map","value":[["b94782b18c6",{"accounts":["0x1111111111111111111111111111111111111111"],"chainId":1,"connector":{"id":"io.test.mockwallet","name":"Mock Wallet","type":"injected","uid":"b94782b18c6"}}]]},"chainId":1,"current":"b94782b18c6"},"version":2}',
    ],
    [
      "store",
      '{"state":{"connections":{"__type":"Map","value":[["b94782b18c6",{"accounts":["0x1111111111111111111111111111111111111111"],"chainId":100,"connector":{"id":"io.test.mockwallet","name":"Mock Wallet","type":"injected","uid":"b94782b18c6"}}]]},"chainId":100,"current":"b94782b18c6"},"version":2}',
    ],
    ["store", '{"state":{"connections":{"__type":"Map","value":[]},"chainId":100,"current":null},"version":2}'],
    ["recentConnectorId", '"io.test.mockwallet"'],
  ])("keeps what wagmi stored in a browser: %s %s", async (key, text) => {
    window.localStorage.clear();
    window.localStorage.setItem(`wagmi.${key}`, text);
    expect(await walletStorage().getItem(key)).toEqual(deserialize(text));
    expect(window.localStorage.getItem(`wagmi.${key}`)).toBe(text);
  });

  // A stored state wagmi would load but cannot use: reading the account on the first render threw, and the page
  // rendered nothing (or wagmi's reconnect threw and stayed "reconnecting"). Planted by anything that can write the
  // court origin's storage: another court page or build, an extension, someone at the device.
  const store = (connections: string) =>
    `{"state":{"connections":${connections},"chainId":1,"current":"x"},"version":2}`;
  const connection = (fields: string) => store(`{"__type":"Map","value":[["x",${fields}]]}`);
  const ACCOUNT = "0x00000000000000000000000000000000000000a1";
  const CONNECTOR = { id: "io.test.mockwallet", name: "Mock Wallet", type: "injected", uid: "x" };
  // Converting it to text throws: an object without toString.
  const NO_TEXT = { toString: null };
  /** A connection as wagmi writes it, with `fields` replaced (undefined = left out). */
  const withConnection = (fields: Record<string, unknown>) =>
    JSON.stringify({ accounts: [ACCOUNT], chainId: 1, connector: CONNECTOR, ...fields });
  it.each([
    ["not JSON", "{oops"],
    ["JSON null", "null"],
    ["a number", "5"],
    ["no state", '{"version":2}'],
    ["state a string", '{"state":"x","version":2}'],
    ["connections a number", store("5")],
    ["connections {}", store("{}")],
    ["connections []", store("[]")],
    ["connections null", store("null")],
    ["connections a string", store('"x"')],
    ["a Map with no entries list", store('{"__type":"Map","value":5}')],
    ["a Map entry that is not a pair", store('{"__type":"Map","value":[5]}')],
    ["a connection that is null", connection("null")],
    ["a connection that is a string", connection('"x"')],
    [
      "a connection with no connector",
      connection('{"accounts":["0x00000000000000000000000000000000000000a1"],"chainId":1}'),
    ],
    ["a connection whose connector is null", connection('{"accounts":[],"chainId":1,"connector":null}')],
    ["a connection wagmi reads as a Map", connection('{"__type":"Map","value":[],"connector":{}}')],
    // Each field wagmi reads from a stored connection, of another type than the one wagmi writes.
    ["a connector id that is an object", connection(withConnection({ connector: { ...CONNECTOR, id: NO_TEXT } }))],
    ["a connector id that is a number", connection(withConnection({ connector: { ...CONNECTOR, id: 5 } }))],
    ["a connector with no id", connection(withConnection({ connector: { name: "M", type: "injected", uid: "x" } }))],
    ["a connector uid that is a number", connection(withConnection({ connector: { ...CONNECTOR, uid: 5 } }))],
    ["a connector name that is an object", connection(withConnection({ connector: { ...CONNECTOR, name: NO_TEXT } }))],
    ["a connector type that is null", connection(withConnection({ connector: { ...CONNECTOR, type: null } }))],
    ["accounts that are a number", connection(withConnection({ accounts: 5 }))],
    ["accounts that are a string", connection(withConnection({ accounts: ACCOUNT }))],
    ["an account that is null", connection(withConnection({ accounts: [null] }))],
    ["an account that is an object", connection(withConnection({ accounts: [NO_TEXT] }))],
    ["a connection with no accounts", connection(withConnection({ accounts: undefined }))],
    ["a connection chain id that is a string", connection(withConnection({ chainId: "1" }))],
    ["a connection chain id that is an object", connection(withConnection({ chainId: {} }))],
    ["a connection with no chain id", connection(withConnection({ chainId: undefined }))],
    // Loaded, it made AppKit open its "Switch Network" window with no wallet connected; wagmi's reconnect asks the
    // wallet for its chain anyway.
    ["a connection on a chain the court does not run", connection(withConnection({ chainId: 137 }))],
    ["a Map key that is not a string", store(`{"__type":"Map","value":[[5,${withConnection({})}]]}`)],
    ["a current connection that is an object", '{"state":{"connections":{"__type":"Map","value":[]},"current":{}}}'],
  ])("drops and removes a stored state that is %s", async (_name, text) => {
    window.localStorage.clear();
    window.localStorage.setItem("wagmi.store", text);
    expect(await walletStorage().getItem("store")).toBeNull();
    expect(window.localStorage.getItem("wagmi.store")).toBeNull();
  });

  // wagmi's reconnect uses the last wallet's connector id as an object key: anything but text made it throw.
  it.each([
    ["an object", '{"toString":null}'],
    ["a list", '[{"toString":null}]'],
    ["a number", "5"],
    ["null", "null"],
    ["not JSON", "{oops"],
  ])("drops and removes a stored last-wallet id that is %s", async (_name, text) => {
    window.localStorage.clear();
    window.localStorage.setItem("wagmi.recentConnectorId", text);
    expect(await walletStorage().getItem("recentConnectorId")).toBeNull();
    expect(window.localStorage.getItem("wagmi.recentConnectorId")).toBeNull();
  });

  // The chains AppKit's WalletConnect connector last asked a wallet for, as it stores them: a list of chain ids, `[]`
  // after a disconnect.
  const REQUESTED_CHAINS = "wagmi.walletConnect.requestedChains";
  it.each(["[1,100,11155111,10200]", "[]"])("keeps the chains WalletConnect stored: %s", async (text) => {
    window.localStorage.clear();
    window.localStorage.setItem(REQUESTED_CHAINS, text);
    expect(await walletStorage().getItem("walletConnect.requestedChains")).toEqual(JSON.parse(text));
    expect(window.localStorage.getItem(REQUESTED_CHAINS)).toBe(text);
  });

  // The connector reads them before every session proposal and spreads them into a Set (adapter-wagmi
  // WalletConnectConnector.js:46, :321-323). Each of these threw there: the WalletConnect row showed no QR code, on
  // every load, as nothing rewrites them before a pairing.
  const UNREADABLE_CHAINS: [string, string][] = [
    ["a number", "5"],
    ["true", "true"],
    ["an object", "{}"],
    ["not JSON", "{"],
    ["a bigint wagmi cannot read", '{"__type":"bigint","value":"x"}'],
  ];
  it.each([
    ...UNREADABLE_CHAINS,
    ["a string", '"abc"'],
    ["null", "null"],
    ["a list with a chain id that is text", '[1,"100"]'],
  ])("drops and removes stored WalletConnect chains that are %s", async (_name, text) => {
    window.localStorage.clear();
    window.localStorage.setItem(REQUESTED_CHAINS, text);
    expect(await walletStorage().getItem("walletConnect.requestedChains")).toBeNull();
    expect(window.localStorage.getItem(REQUESTED_CHAINS)).toBeNull();
  });

  it.each([...UNREADABLE_CHAINS, ["the chains it stored", "[1,100,11155111,10200]"]])(
    "WalletConnect proposes a session with stored chains that are %s",
    async (_name, text) => {
      vi.stubGlobal("fetch", () => Promise.reject(new Error("unit tests make no network requests")));
      onTestFinished(() => {
        vi.unstubAllGlobals();
      });
      window.localStorage.clear();
      window.localStorage.setItem(REQUESTED_CHAINS, text);
      const { createWagmiAdapter } = await import("./appkit");
      const adapter = createWagmiAdapter("test-project-id", readEnv({}));
      const proposals: unknown[] = [];
      await adapter.setUniversalProvider(universalProvider(proposals));
      const connector = adapter.wagmiConfig.connectors.find((c) => c.id === "walletConnect");
      if (connector === undefined) throw new Error("WalletConnect connector missing");
      await connector.connect();
      expect(proposals).toHaveLength(1);
    },
  );
});

const WALLET_ACCOUNT = "0x00000000000000000000000000000000000000A1";

/**
 * wagmi with one browser wallet that has authorized the site: "announced" = one announced through EIP-6963 (wagmi's
 * injected connector with that wallet as target), "default" = the browser's default wallet (`window.ethereum`, the
 * injected connector with no target that AppKit's adapter adds).
 */
function browserWalletConfig(wallet: "announced" | "default") {
  // A wallet that answers only for its account and chain, as one without wallet_requestPermissions.
  const provider = {
    request: ({ method }: { method: string }): Promise<unknown> => {
      if (method === "eth_requestAccounts" || method === "eth_accounts") return Promise.resolve([WALLET_ACCOUNT]);
      if (method === "eth_chainId") return Promise.resolve("0x1");
      return Promise.reject(Object.assign(new Error(`${method} is not supported`), { code: 4200 }));
    },
    on: () => undefined,
    removeListener: () => undefined,
  };
  if (wallet === "default") {
    vi.stubGlobal("ethereum", provider);
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });
  }
  return createConfig({
    chains: [mainnet],
    connectors: [
      wallet === "announced"
        ? injected({ target: { id: "io.test.mockwallet", name: "Mock Wallet", provider: provider as never } })
        : injected(),
    ],
    multiInjectedProviderDiscovery: false,
    storage: walletStorage(),
    transports: { [mainnet.id]: custom({ request: () => Promise.reject(new Error("no network")) }) },
  });
}

function onlyConnector(config: ReturnType<typeof browserWalletConfig>) {
  const [connector] = config.connectors;
  if (connector === undefined) throw new Error("injected connector missing");
  return connector;
}

/** Enough of WalletConnect's UniversalProvider for AppKit's connector to propose a session: no session, no relay. */
function universalProvider(proposals: unknown[]): Parameters<WagmiAdapter["setUniversalProvider"]>[0] {
  const provider = {
    session: undefined,
    events: { setMaxListeners: () => undefined },
    on: () => provider,
    removeListener: () => provider,
    setDefaultChain: () => undefined,
    connect: (proposal: unknown) => {
      proposals.push(proposal);
      return Promise.resolve(undefined);
    },
  };
  return provider as unknown as Parameters<WagmiAdapter["setUniversalProvider"]>[0];
}
