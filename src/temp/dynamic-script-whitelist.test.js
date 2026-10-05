import dynamicScriptWhitelist, { isDynamicScriptWhitelisted } from "./dynamic-script-whitelist";

describe("isDynamicScriptWhitelisted", () => {
  const mainnet = dynamicScriptWhitelist[1][0];
  const sepoliaOnly = dynamicScriptWhitelist[11155111].find((cid) => !dynamicScriptWhitelist[1].includes(cid));

  it("accepts a whitelisted script in every common IPFS URI form", () => {
    expect(isDynamicScriptWhitelisted(mainnet, 1)).toBe(true);
    expect(isDynamicScriptWhitelisted(`/ipfs/${mainnet}`, 1)).toBe(true);
    expect(isDynamicScriptWhitelisted(`ipfs://${mainnet}`, 1)).toBe(true);
    expect(isDynamicScriptWhitelisted(`fs://${mainnet}`, 1)).toBe(true);
  });

  it("only accepts a script for the chain it is listed under", () => {
    expect(isDynamicScriptWhitelisted(sepoliaOnly, 11155111)).toBe(true);
    expect(isDynamicScriptWhitelisted(sepoliaOnly, 1)).toBe(false);
    expect(isDynamicScriptWhitelisted(mainnet, 137)).toBe(false);
  });

  it("rejects anything else", () => {
    expect(isDynamicScriptWhitelisted("/ipfs/QmVkffjdrtLVsRxybdB2xSidamnUrvck3FVxmKxJz6eD7f", 1)).toBe(false);
    expect(isDynamicScriptWhitelisted(`/ipfs/${mainnet}/other.js`, 1)).toBe(false);
    expect(isDynamicScriptWhitelisted("https://example.com/script.js", 1)).toBe(false);
    expect(isDynamicScriptWhitelisted(undefined, 1)).toBe(false);
  });
});
