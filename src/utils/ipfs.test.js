import { normalizeIpfsUri } from "./ipfs-normalizer";
import { isSafeNavigationUrl } from "./urlValidation";

describe("normalizeIpfsUri", () => {
  it.each([
    ["ipfs://bafkreigi53smvtvoi2s5zh3wd5ztu7pzl4lao5v4y7xihd3bjrpwtuyk2a"],
    ["ipfs:/bafkreigi53smvtvoi2s5zh3wd5ztu7pzl4lao5v4y7xihd3bjrpwtuyk2a"],
    ["/ipfs/bafkreigi53smvtvoi2s5zh3wd5ztu7pzl4lao5v4y7xihd3bjrpwtuyk2a"],
    ["ipfs/bafkreigi53smvtvoi2s5zh3wd5ztu7pzl4lao5v4y7xihd3bjrpwtuyk2a"],
  ])("normalizes %s to the Kleros CDN IPFS path", (uri) => {
    expect(normalizeIpfsUri(uri)).toBe(
      "https://cdn.kleros.link/ipfs/bafkreigi53smvtvoi2s5zh3wd5ztu7pzl4lao5v4y7xihd3bjrpwtuyk2a"
    );
  });

  it("normalizes IPFS URIs with nested paths", () => {
    expect(normalizeIpfsUri("ipfs://QmYs17mAJTaQwYeXNTb6n4idoQXmRcAjREeUdjJShNSeKh/index.html")).toBe(
      "https://cdn.kleros.link/ipfs/QmYs17mAJTaQwYeXNTb6n4idoQXmRcAjREeUdjJShNSeKh/index.html"
    );
  });

  it("leaves absolute HTTP URLs unchanged", () => {
    const uri = "https://cdn.kleros.link/ipfs/bafkreigi53smvtvoi2s5zh3wd5ztu7pzl4lao5v4y7xihd3bjrpwtuyk2a";

    expect(normalizeIpfsUri(uri)).toBe(uri);
    expect(normalizeIpfsUri("http://example.com/file.json")).toBe("http://example.com/file.json");
  });

  it("leaves non-IPFS values unchanged", () => {
    expect(normalizeIpfsUri("data.json")).toBe("data.json");
    expect(normalizeIpfsUri(null)).toBe(null);
    expect(normalizeIpfsUri(undefined)).toBe(undefined);
  });

  it("does not preserve executable schemes when normalizing IPFS URIs", () => {
    const normalizedUri = normalizeIpfsUri("ipfs://javascript:alert(1)");

    expect(normalizedUri).toBe("https://cdn.kleros.link/ipfs/javascript:alert(1)");
    expect(new URL(normalizedUri).protocol).toBe("https:");
  });

  it("keeps non-IPFS executable schemes unsafe", () => {
    const normalizedUri = normalizeIpfsUri("javascript:alert(1)");

    expect(normalizedUri).toBe("javascript:alert(1)");
    expect(isSafeNavigationUrl(normalizedUri)).toBe(false);
  });
});
