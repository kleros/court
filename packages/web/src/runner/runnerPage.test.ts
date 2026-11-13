import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Read as a browser reads it, with an HTML parser (jsdom's DOMParser), never with regexes: a regex misreads markup a
// browser accepts (`</script >`, a ">" inside an attribute value, comments).
describe("runner page (public/__runner/index.html)", () => {
  // A path, not a URL: under jsdom, new URL("../..", import.meta.url) comes out http:, which readFileSync refuses.
  const html = readFileSync(join(import.meta.dirname, "../../public/__runner/index.html"), "utf8");
  const page = new DOMParser().parseFromString(html, "text/html");

  it("declares UTF-8 first, so a script's non-ASCII text reads as written", () => {
    const first = page.head.firstElementChild;
    expect(first?.localName).toBe("meta");
    expect(first?.getAttributeNames()).toEqual(["charset"]);
    expect(first?.getAttribute("charset")).toBe("utf-8");
  });

  it("loads only the classic bootstrap: one script element, no inline code, nothing else", () => {
    const scripts = page.querySelectorAll("script");
    expect(scripts).toHaveLength(1);
    expect(scripts[0]?.getAttributeNames()).toEqual(["src"]);
    expect(scripts[0]?.getAttribute("src")).toBe("/__runner/bootstrap.js");
    expect(scripts[0]?.textContent).toBe("");
    expect(page.querySelector("link, img, iframe, object, embed, base")).toBeNull();
  });

  it("keeps its title (the app's smoke test frames the runner and reads it)", () => {
    expect(html).toContain("<title>Kleros Court script runner</title>");
  });
});
