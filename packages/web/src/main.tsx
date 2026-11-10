import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import "./index.css";
import { App } from "./App";
import { env } from "./env";
import { isFramed } from "./framing";
import { routes } from "./routes";
import { initSentry } from "./sentry";
import { initWallet } from "./wallet/init";

async function start(): Promise<void> {
  if (isFramed(window)) {
    console.error("Kleros Court does not run inside a frame.");
    return;
  }
  const root = document.getElementById("root");
  if (root === null) throw new Error("#root missing from index.html");
  await initSentry(env).catch((error: unknown) => {
    console.error("Sentry failed to start.", error);
  });
  const wallet = await initWallet(env, window.location.origin);
  createRoot(root).render(
    <StrictMode>
      <App wallet={wallet} router={createBrowserRouter(routes)} />
    </StrictMode>,
  );
}

void start();
