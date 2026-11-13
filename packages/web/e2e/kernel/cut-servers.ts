/**
 * Loopback servers for the fetch-cache test (127.0.0.1 only; design §25.5): a plain page that loads the kernel's own
 * fetcher from its source file, and two HTTPS file servers that cut the FIRST answer for a path and send the whole file
 * after that, the way a passing cut looks. The cut endings are the ones the engines were measured on:
 * - HTTP/1.1: Content-Length and `Connection: close`, ended by a bare TCP FIN after the cut (no TLS close_notify, so TLS
 *   is layered by hand on the raw socket). WebKit hands that over as a complete answer.
 * - HTTP/2: the cut, then an empty DATA frame with END_STREAM (the stream ends early, no error). Chromium and Firefox
 *   hand that over as a complete answer.
 * File answers carry the IPFS gateway's caching headers (immutable, kept for a year); a preflight gets the gateway's
 * allow list, which has no Cache-Control or Pragma. Every request is logged.
 */
import { execFileSync } from "node:child_process";
import { X509Certificate, createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { createSecureServer, type IncomingHttpHeaders, type ServerHttp2Session } from "node:http2";
import { createServer as createTcpServer, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TLSSocket, createSecureContext } from "node:tls";
import ts from "typescript";

/** A small case file (696 bytes, ASCII) and where its first answer stops. */
export const FILE = JSON.stringify({
  title: "Case",
  description: "y".repeat(600),
  rulingOptions: { type: "single-select", titles: ["Yes", "No"] },
});
export const CUT = 300;

export interface SeenRequest {
  readonly method: string;
  readonly path: string;
  /** Lowercase names. */
  readonly headers: Readonly<Record<string, string>>;
}

export interface CutServers {
  /** The page whose `window.kernelFetch` runs the kernel's createFetcher over the browser's fetch. */
  readonly pageUrl: string;
  readonly http1Origin: string;
  readonly http2Origin: string;
  /** sha256 of the certificate's public key, base64, for Chromium's --ignore-certificate-errors-spki-list. */
  readonly spki: string;
  readonly requests: readonly SeenRequest[];
  close(): void;
}

// As the gateway answers (cdn.kleros.link, HEAD on a pinned file, 2026-11-12).
const PREFLIGHT_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD",
  "access-control-allow-headers": "Content-Type, Range, User-Agent, X-Requested-With",
  "access-control-max-age": "1728000",
};
const fileHeaders = (): Record<string, string> => ({
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=29030400, immutable",
  etag: '"case-file"',
  date: new Date().toUTCString(),
  "content-type": "application/json",
  "content-length": String(FILE.length),
});

// The kernel's fetcher, with the browser's own fetch; each call returns what the test compares.
const PAGE = `<!doctype html>
<meta charset="utf-8" />
<title>kernel fetch</title>
<script type="module">
  import { createFetcher } from "/kernel/fetcher.ts";
  const fetcher = createFetcher((input, init) => fetch(input, init));
  window.kernelFetch = async (request) => {
    const outcome = await fetcher({ timeoutMs: 10000, maxBytes: 1048576, ...request });
    return outcome.ok
      ? { ok: true, status: outcome.value.status, text: new TextDecoder().decode(outcome.value.bytes) }
      : { ok: false, failure: outcome.failure };
  };
</script>`;

const ignore = (): undefined => undefined;

export async function startCutServers(kernelDir: string): Promise<CutServers> {
  const { key, cert } = selfSignedCertificate();
  const requests: SeenRequest[] = [];
  const answered = new Set<string>();
  /** Only a path's first file answer is cut. */
  const cutThisAnswer = (path: string): boolean => {
    const first = !answered.has(path);
    answered.add(path);
    return first;
  };

  const page = createHttpServer((request, response) => {
    const { pathname } = new URL(request.url ?? "/", "http://127.0.0.1");
    if (pathname === "/") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(PAGE);
      return;
    }
    const source = kernelModule(kernelDir, pathname);
    if (source === null) response.writeHead(404).end();
    else response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }).end(source);
  });

  const secureContext = createSecureContext({ key, cert });
  const sockets = new Set<Socket>();
  const http1 = createTcpServer((raw) => {
    sockets.add(raw);
    raw.on("close", () => sockets.delete(raw));
    raw.on("error", ignore);
    const tls = new TLSSocket(raw, { isServer: true, secureContext, ALPNProtocols: ["http/1.1"] });
    tls.on("error", ignore);
    let received = "";
    tls.on("data", (chunk: Buffer) => {
      received += chunk.toString("latin1");
      const end = received.indexOf("\r\n\r\n");
      if (end === -1) return;
      const [requestLine = "", ...lines] = received.slice(0, end).split("\r\n");
      const [method = "", path = ""] = requestLine.split(" ");
      const headers = Object.fromEntries(
        lines.map((line) => [line.slice(0, line.indexOf(":")).toLowerCase(), line.slice(line.indexOf(":") + 1).trim()]),
      );
      requests.push({ method, path, headers });
      // One request per connection: every answer says Connection: close and ends with the socket.
      tls.removeAllListeners("data");
      if (method === "OPTIONS") {
        tls.write(head("204 No Content", { ...PREFLIGHT_HEADERS, "content-length": "0", connection: "close" }));
      } else {
        tls.write(head("200 OK", { ...fileHeaders(), connection: "close" }));
        tls.write(cutThisAnswer(path) ? FILE.slice(0, CUT) : FILE);
      }
      // A bare TCP FIN, with no TLS close_notify before it: the ending WebKit was measured on.
      setTimeout(() => raw.end(), 40);
    });
  });

  const sessions = new Set<ServerHttp2Session>();
  const http2 = createSecureServer({ key, cert, ALPNProtocols: ["h2"] });
  http2.on("session", (session) => {
    sessions.add(session);
    session.on("close", () => sessions.delete(session));
    session.on("error", ignore);
  });
  http2.on("stream", (stream, headers) => {
    stream.on("error", ignore);
    const method = String(headers[":method"]);
    const path = String(headers[":path"]);
    requests.push({ method, path, headers: plainHeaders(headers) });
    if (method === "OPTIONS") {
      stream.respond({ ":status": 204, ...PREFLIGHT_HEADERS }, { endStream: true });
      return;
    }
    stream.respond({ ":status": 200, ...fileHeaders() });
    if (!cutThisAnswer(path)) {
      stream.end(FILE);
      return;
    }
    stream.write(FILE.slice(0, CUT));
    // The stream ends early with no error: an empty DATA frame carrying END_STREAM.
    setTimeout(() => stream.end(), 40);
  });

  await Promise.all([listen(page), listen(http1), listen(http2)]);
  return {
    pageUrl: `http://127.0.0.1:${portOf(page)}/`,
    http1Origin: `https://127.0.0.1:${portOf(http1)}`,
    http2Origin: `https://127.0.0.1:${portOf(http2)}`,
    spki: createHash("sha256")
      .update(new X509Certificate(cert).publicKey.export({ type: "spki", format: "der" }))
      .digest("base64"),
    requests,
    close() {
      for (const socket of sockets) socket.destroy();
      for (const session of sessions) session.destroy();
      page.closeAllConnections();
      page.close();
      http1.close();
      http2.close();
    },
  };
}

/**
 * Made for each run, never stored: a private key in the repository would trip the secret scan, and nothing needs it
 * after the run.
 */
function selfSignedCertificate(): { key: string; cert: string } {
  const dir = mkdtempSync(join(tmpdir(), "court-e2e-tls-"));
  try {
    const keyFile = join(dir, "key.pem");
    const certFile = join(dir, "cert.pem");
    const subject = ["-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1"];
    execFileSync(
      "openssl",
      ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", keyFile, "-out", certFile, "-days", "2", ...subject],
      { stdio: "ignore" },
    );
    return { key: readFileSync(keyFile, "utf8"), cert: readFileSync(certFile, "utf8") };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** A kernel source file as a browser module: types removed, `.ts` import paths kept (this server answers them). */
function kernelModule(kernelDir: string, pathname: string): string | null {
  const name = /^\/kernel\/([a-z]+\.ts)$/.exec(pathname)?.[1];
  if (name === undefined || !existsSync(join(kernelDir, name))) return null;
  const source = readFileSync(join(kernelDir, name), "utf8");
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

function head(status: string, headers: Record<string, string>): string {
  const lines = Object.entries(headers).map(([name, value]) => `${name}: ${value}`);
  return [`HTTP/1.1 ${status}`, ...lines].join("\r\n") + "\r\n\r\n";
}

function plainHeaders(headers: IncomingHttpHeaders): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name, Array.isArray(value) ? value.join(", ") : String(value)]),
  );
}

function listen(server: { listen(port: number, host: string, done: () => void): unknown }): Promise<void> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
}

function portOf(server: { address(): unknown }): number {
  const address = server.address();
  if (typeof address !== "object" || address === null || !("port" in address)) throw new Error("server not listening");
  return Number(address.port);
}
