// Dynamic-script runner (D-18). The Vite plugin that builds the runner page's bootstrap lives in vite-plugins/runner/,
// outside src/, so it never enters the app's module graph; the page's entry is page/main.ts.
export type * from "./types";
export { RUNNER_PATH } from "./protocol";
export { createIframeScriptRunner } from "./host/createIframeScriptRunner";
export { bootstrapRunner } from "./page/bootstrap";
