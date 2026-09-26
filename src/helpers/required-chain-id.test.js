import { withRequiredChainId } from "./required-chain-id";

describe("withRequiredChainId", () => {
  it("leaves a URL without the param untouched, byte for byte", () => {
    const url = "https://court.kleros.io/cases/1004";
    expect(withRequiredChainId(url, 100)).toBe(url);
  });

  it("leaves other params alone when the param is missing", () => {
    const url = "https://court.kleros.io/cases/1004?foo=bar#top";
    expect(withRequiredChainId(url, 100)).toBe(url);
  });

  it("points the param at the new chain", () => {
    expect(withRequiredChainId("https://court.kleros.io/cases/1004?requiredChainId=1", 100)).toBe(
      "https://court.kleros.io/cases/1004?requiredChainId=100"
    );
  });

  it("keeps other params and the hash", () => {
    expect(withRequiredChainId("https://court.kleros.io/cases/1004?foo=bar&requiredChainId=100#top", 1)).toBe(
      "https://court.kleros.io/cases/1004?foo=bar&requiredChainId=1#top"
    );
  });

  it("replaces an invalid value too", () => {
    expect(withRequiredChainId("https://court.kleros.io/cases/1004?requiredChainId=abc", 1)).toBe(
      "https://court.kleros.io/cases/1004?requiredChainId=1"
    );
  });

  it("works on localhost dev URLs", () => {
    expect(withRequiredChainId("http://localhost:3000/cases/1004?requiredChainId=1", 100)).toBe(
      "http://localhost:3000/cases/1004?requiredChainId=100"
    );
  });
});
