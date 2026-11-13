/**
 * Serves the production build (dist/) for the end-to-end tests the way Netlify is expected to: each response gets the
 * built _headers rules matching its request path (e2e/netlify-headers.ts, the court lab's reading), a file that exists
 * is sent as is, and any other path is answered by index.html with 200 (netlify.toml's SPA fallback). A path two rules
 * give the same header answers 500, as in the lab. Local only (127.0.0.1).
 * usage: node e2e/serve.ts <port>
 */
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { headersFor, parseHeaders } from "./netlify-headers.ts";

/** No trailing separator, so fileFor can accept only dist/ itself or a path under DIST + sep. */
const DIST = resolve(fileURLToPath(new URL("../dist/", import.meta.url)));
const TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const rules = parseHeaders(readFileSync(join(DIST, "_headers"), "utf8"));

function fileFor(pathname: string): string {
  const index = join(DIST, "index.html");
  const requested = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const file = resolve(DIST, `.${requested}`);
  if (file !== DIST && !file.startsWith(DIST + sep)) return index;
  return existsSync(file) && statSync(file).isFile() ? file : index;
}

createServer((request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://127.0.0.1");
  const { headers, conflicts } = headersFor(rules, pathname);
  if (conflicts.length > 0) {
    response
      .writeHead(500, { "content-type": "text/plain; charset=utf-8" })
      .end(`_headers: two rules set ${conflicts.join(", ")} on ${pathname}`);
    return;
  }
  const file = fileFor(pathname);
  response.writeHead(200, {
    ...Object.fromEntries(headers),
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
  });
  response.end(readFileSync(file));
}).listen(Number(process.argv[2]), "127.0.0.1");
