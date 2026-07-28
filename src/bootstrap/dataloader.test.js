import axios from "axios";
import { dataloaders } from "./dataloader";

jest.mock("axios", () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock("./web3", () => ({
  getReadOnlyRpcUrl: () => "http://localhost:8545",
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
});
