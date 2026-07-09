import { IPFS_GATEWAY, isContentAddressed, toHttpUrl } from "./ipfs";

//Mainnet General Court policy
const CID_V0 = "Qmd1TMEbtic3TSonu5dfqa5k3aSrjxRGY8oJH3ruGgazRB";

//IPFS docs example
const CID_V1 = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

const GATEWAY_URL = `${IPFS_GATEWAY}/ipfs/${CID_V0}`;

describe("toHttpUrl", () => {
  it("resolves all common IPFS URI forms to the gateway", () => {
    expect(toHttpUrl(`/ipfs/${CID_V0}`)).toBe(GATEWAY_URL);
    expect(toHttpUrl(`ipfs/${CID_V0}`)).toBe(GATEWAY_URL);
    expect(toHttpUrl(`ipfs://${CID_V0}`)).toBe(GATEWAY_URL);
    expect(toHttpUrl(`ipfs:${CID_V0}`)).toBe(GATEWAY_URL);
    expect(toHttpUrl(`ipfs://ipfs/${CID_V0}`)).toBe(GATEWAY_URL);
  });

  it("resolves legacy fs: forms to the gateway", () => {
    expect(toHttpUrl(`fs:/ipfs/${CID_V0}`)).toBe(GATEWAY_URL);
    expect(toHttpUrl(`fs://ipfs/${CID_V0}`)).toBe(GATEWAY_URL);
  });

  it("resolves bare hashes to the gateway", () => {
    expect(toHttpUrl(CID_V0)).toBe(GATEWAY_URL);
    expect(toHttpUrl(`${CID_V0}/file.json`)).toBe(`${GATEWAY_URL}/file.json`);
  });

  it("returns absolute http(s) URLs unchanged", () => {
    const curateURL = "https://curate.kleros.io/tcr/1/0x6e31D83B0c696f7D57241d3DffD0f2B628D14C67";
    expect(toHttpUrl(curateURL)).toBe(curateURL);
    expect(toHttpUrl("http://google.com")).toBe("http://google.com");
  });

  it("returns undefined for empty or non-string input", () => {
    expect(toHttpUrl("")).toBeUndefined();
    expect(toHttpUrl(null)).toBeUndefined();
    expect(toHttpUrl(undefined)).toBeUndefined();
    expect(toHttpUrl(42)).toBeUndefined();
  });
});

describe("isContentAddressed", () => {
  it("accepts all common IPFS URI forms", () => {
    expect(isContentAddressed(`/ipfs/${CID_V0}`)).toBe(true);
    expect(isContentAddressed(`ipfs/${CID_V0}`)).toBe(true);
    expect(isContentAddressed(`ipfs://${CID_V1}`)).toBe(true);
    expect(isContentAddressed(`ipfs:${CID_V0}`)).toBe(true);
    expect(isContentAddressed(`fs:/ipfs/${CID_V0}`)).toBe(true);
  });

  it("accepts bare CIDv0 and base32 CIDv1 hashes, with or without a path", () => {
    expect(isContentAddressed(CID_V0)).toBe(true);
    expect(isContentAddressed(CID_V1)).toBe(true);
    expect(isContentAddressed(`${CID_V0}/file.json`)).toBe(true);
  });

  it("rejects host-anchored and mutable URIs", () => {
    expect(isContentAddressed(`https://cdn.kleros.link/ipfs/${CID_V1}`)).toBe(false);
    expect(isContentAddressed("http://example.com")).toBe(false);
    expect(isContentAddressed("ipns://k51qzi5uqu5dgutdk6i1ynyzg")).toBe(false);
    expect(isContentAddressed("/ipns/k51qzi5uqu5dgutdk6i1ynyzg")).toBe(false);
  });

  it("rejects strings that only resemble hashes", () => {
    expect(isContentAddressed("Qmtooshort")).toBe(false);
    expect(isContentAddressed(`${CID_V0}X`)).toBe(false);
    expect(isContentAddressed("whatever")).toBe(false);
    expect(isContentAddressed("some random text")).toBe(false);
  });

  it("rejects empty or non-string input", () => {
    expect(isContentAddressed("")).toBe(false);
    expect(isContentAddressed(null)).toBe(false);
    expect(isContentAddressed(undefined)).toBe(false);
  });
});
