import axios from "axios";
import iframe from "iframe";
import { dataloaders } from "./dataloader";
import { fetchRealityQuestion } from "../temp/reality-question";

jest.mock("axios", () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock("./web3", () => ({
  getReadOnlyRpcUrl: () => "http://localhost:8545",
}));
jest.mock("iframe", () =>
  jest.fn(({ body }) => {
    const target = body.match(/target: "(script-\d+)"/)[1];
    setTimeout(() =>
      global.window.dispatchEvent(
        new global.MessageEvent("message", {
          source: global.window,
          data: { target, result: { rulingOptions: { type: "single-select", titles: ["Ran"] } } },
        })
      )
    );
    return { iframe: { contentWindow: global.window, style: {}, remove: () => {} } };
  })
);
jest.mock("../temp/reality-question", () => ({
  ...jest.requireActual("../temp/reality-question"),
  fetchRealityQuestion: jest.fn(),
}));

//Test values - change if needed
const CHAIN_ID = 1;
const ARBITRATED = "0x0000000000000000000000000000000000000001";
const ARBITRATOR = "0x0000000000000000000000000000000000000002";
const DISPUTE_ID = "1657";
const META_EVIDENCE_URI = "/ipfs/QmVkcsYWd22JkG2rq29wQzNeXP5WEZ9vyVrrnhzry5vdHa";
const META_EVIDENCE_JSON = {
  title: "A reality.eth question",
  rulingOptions: { type: "single-select", titles: ["Yes", "No"] },
};

const loadMetaEvidence = (ruled) =>
  dataloaders.getMetaEvidence.load([CHAIN_ID, ARBITRATED, ARBITRATOR, DISPUTE_ID, ruled]);

describe("Dataloader", () => {
  beforeEach(() => {
    process.env.REACT_APP_METAEVIDENCE_URL = "https://kleros-api.test/get-dispute-metaevidence";
    window.localStorage.clear();
    dataloaders.getMetaEvidence.clearAll();
    axios.get.mockReset();
    iframe.mockClear();
    axios.get.mockImplementation((url) =>
      url.startsWith(process.env.REACT_APP_METAEVIDENCE_URL)
        ? Promise.resolve({ status: 200, data: { metaEvidenceUri: META_EVIDENCE_URI } })
        : Promise.resolve({ status: 200, data: { ...META_EVIDENCE_JSON } })
    );
  });

  it("caches the result of a ruled dispute and serves the data without extra network requests", async () => {
    const first = await loadMetaEvidence(true);
    expect(first).toMatchObject(META_EVIDENCE_JSON);
    expect(axios.get).toHaveBeenCalledTimes(2);

    dataloaders.getMetaEvidence.clearAll();
    const second = await loadMetaEvidence(true);
    expect(second).toEqual(first);
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  it("does not cache the result of an unruled dispute", async () => {
    await loadMetaEvidence(false);
    expect(axios.get).toHaveBeenCalledTimes(2);

    dataloaders.getMetaEvidence.clearAll();
    await loadMetaEvidence(false);
    expect(axios.get).toHaveBeenCalledTimes(4);
  });

  it("serves a previously cached dispute even when queried as unruled", async () => {
    await loadMetaEvidence(true);

    dataloaders.getMetaEvidence.clearAll();
    await loadMetaEvidence(false);
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  it("discards a cached entry with an invalid shape, refetches and overwrites it", async () => {
    const cacheKey = `@@kleros/court/metaevidence/v2/${CHAIN_ID}/${ARBITRATOR}/${DISPUTE_ID}`;
    window.localStorage.setItem(cacheKey, JSON.stringify({ foo: "bar" }));

    const result = await loadMetaEvidence(true);
    expect(result).toMatchObject(META_EVIDENCE_JSON);
    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(JSON.parse(window.localStorage.getItem(cacheKey))).toMatchObject(META_EVIDENCE_JSON);
  });

  it("removes an invalid cached entry even when the dispute is not ruled", async () => {
    const cacheKey = `@@kleros/court/metaevidence/v2/${CHAIN_ID}/${ARBITRATOR}/${DISPUTE_ID}`;
    window.localStorage.setItem(cacheKey, JSON.stringify({ foo: "bar" }));

    await loadMetaEvidence(false);
    expect(window.localStorage.getItem(cacheKey)).toBeNull();
  });

  it("does not cache a malformed gateway response served with status 200", async () => {
    axios.get.mockImplementation((url) =>
      url.startsWith(process.env.REACT_APP_METAEVIDENCE_URL)
        ? Promise.resolve({ status: 200, data: { metaEvidenceUri: META_EVIDENCE_URI } })
        : Promise.resolve({ status: 200, data: "<html>gateway error</html>" })
    );

    await loadMetaEvidence(true);
    expect(axios.get).toHaveBeenCalledTimes(2);

    dataloaders.getMetaEvidence.clearAll();
    await loadMetaEvidence(true);
    expect(axios.get).toHaveBeenCalledTimes(4);
  });

  it("does not cache the tamper fallback returned for invalid case data", async () => {
    axios.get.mockImplementation(() =>
      Promise.resolve({ status: 200, data: { metaEvidenceUri: "https://example.com/meta.json" } })
    );

    const result = await loadMetaEvidence(true);
    expect(result.title).toBe("Invalid or tampered case data, refuse to arbitrate.");

    dataloaders.getMetaEvidence.clearAll();
    axios.get.mockClear();
    await loadMetaEvidence(true);
    expect(axios.get).toHaveBeenCalled();
  });

  it("does not run a dynamic script that is not whitelisted and returns the tamper fallback", async () => {
    const dynamicScriptURI = "/ipfs/QmVkffjdrtLVsRxybdB2xSidamnUrvck3FVxmKxJz6eD7f";
    axios.get.mockImplementation((url) =>
      url.startsWith(process.env.REACT_APP_METAEVIDENCE_URL)
        ? Promise.resolve({ status: 200, data: { metaEvidenceUri: META_EVIDENCE_URI } })
        : Promise.resolve({ status: 200, data: { ...META_EVIDENCE_JSON, dynamicScriptURI } })
    );

    const result = await loadMetaEvidence(false);
    expect(result.title).toBe("Invalid or tampered case data, refuse to arbitrate.");
    expect(axios.get.mock.calls.some(([url]) => url.includes(dynamicScriptURI.slice("/ipfs/".length)))).toBe(false);
  });

  it("runs a whitelisted dynamic script and merges its result", async () => {
    const dynamicScriptURI = "/ipfs/QmZZHwVaXWtvChdFPG4UeXStKaC9aHamwQkNTEAfRmT2Fj";
    axios.get.mockImplementation((url) =>
      url.startsWith(process.env.REACT_APP_METAEVIDENCE_URL)
        ? Promise.resolve({ status: 200, data: { metaEvidenceUri: META_EVIDENCE_URI } })
        : url.includes("QmZZHwVaXWtvChdFPG4UeXStKaC9aHamwQkNTEAfRmT2Fj")
        ? Promise.resolve({ status: 200, data: "/* the script */" })
        : Promise.resolve({ status: 200, data: { ...META_EVIDENCE_JSON, dynamicScriptURI } })
    );

    const result = await loadMetaEvidence(false);
    expect(iframe).toHaveBeenCalledTimes(1);
    expect(iframe.mock.calls[0][0].body).toContain("/* the script */");
    expect(result.rulingOptions.titles).toEqual(["Ran"]);
  });

  it("fetches the override script for dispute 1621 instead of the one in its MetaEvidence", async () => {
    const dynamicScriptURI = "/ipfs/QmdpXXmNxmdmLqZCabRUC9bZ65c2BN54EuUTRi5SdtiHQ4";
    axios.get.mockImplementation((url) =>
      url.startsWith(process.env.REACT_APP_METAEVIDENCE_URL)
        ? Promise.resolve({ status: 200, data: { metaEvidenceUri: META_EVIDENCE_URI } })
        : url.includes("Qmf1k727vP7qZv21MDB8vwL6tfVEKPCUQAiw8CTfHStkjf")
        ? Promise.resolve({ status: 200, data: "/* override */" })
        : url.includes("QmdpXXmNxmdmLqZCabRUC9bZ65c2BN54EuUTRi5SdtiHQ4")
        ? Promise.resolve({ status: 200, data: "/* original */" })
        : Promise.resolve({ status: 200, data: { ...META_EVIDENCE_JSON, dynamicScriptURI } })
    );

    await dataloaders.getMetaEvidence.load([CHAIN_ID, ARBITRATED, ARBITRATOR, "1621", false]);
    expect(iframe).toHaveBeenCalledTimes(1);
    expect(iframe.mock.calls[0][0].body).toContain("/* override */");
    expect(iframe.mock.calls[0][0].body).not.toContain("/* original */");
  });

  describe("Reality.eth arbitrables", () => {
    //Kleros dispute 1680 on Ethereum (Realitio_v2_1_ArbitratorWithAppeals, Reality.eth v3.0 question
    //0x7eea8e9e34d09c2964393878714198552f7b41381407e8bfee7312199e748844). The template is a bool question, but its first
    //parameter overrides the type with a single-select ["Yes","No"] when populated by reality-eth-lib.
    const REALITY_ARBITRATED = "0xf72CfD1B34a91A64f9A98537fe63FBaB7530AdcA";
    const TEMPLATE = '{"lang":"en","type":"bool","category":"DAO proposal","title":"Did the proposal %s pass? 0x%s"}';
    const QUESTION = '0x1275956c","type":"single-select","outcomes":["Yes","No"],"has_invalid":false,"z":"\u241fe423';

    const loadRealityMetaEvidence = () =>
      dataloaders.getMetaEvidence.load([CHAIN_ID, REALITY_ARBITRATED, ARBITRATOR, "1680", false]);

    beforeEach(() => {
      fetchRealityQuestion.mockReset();
      fetchRealityQuestion.mockResolvedValue({ templateText: TEMPLATE, questionText: QUESTION, templateId: "20" });
    });

    it("derives the ruling options from the on-chain question instead of trusting the MetaEvidence", async () => {
      const result = await loadRealityMetaEvidence();
      expect(fetchRealityQuestion).toHaveBeenCalledWith({
        arbitratorChainId: CHAIN_ID,
        arbitrable: REALITY_ARBITRATED,
        disputeId: "1680",
      });
      expect(result.rulingOptions).toEqual({
        type: "single-select",
        titles: ["No", "Yes"],
        reserved: { "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF": "Answered Too Soon" },
      });
      expect(result.realityQuestion).toMatchObject({ status: "verified", divergent: true });
    });

    it("does not run the dynamic script of a known Reality.eth arbitrable", async () => {
      axios.get.mockImplementation((url) =>
        url.startsWith(process.env.REACT_APP_METAEVIDENCE_URL)
          ? Promise.resolve({ status: 200, data: { metaEvidenceUri: META_EVIDENCE_URI } })
          : Promise.resolve({
              status: 200,
              data: {
                ...META_EVIDENCE_JSON,
                dynamicScriptURI: "/ipfs/QmWWsDmvjhR9UVRgkcG75vAKzfK3vB85EkZzudnaxwfAWr/bundle.js",
              },
            })
      );
      const result = await loadRealityMetaEvidence();
      expect(axios.get).toHaveBeenCalledTimes(2);
      expect(result.rulingOptions.titles).toEqual(["No", "Yes"]);
    });

    it("does not look up questions for other arbitrables", async () => {
      await loadMetaEvidence(false);
      expect(fetchRealityQuestion).not.toHaveBeenCalled();
    });
  });
});
