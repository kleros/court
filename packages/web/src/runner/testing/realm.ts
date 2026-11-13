import { entryPointSource } from "../page/evaluate";
import type { RunnerEnvironment } from "../types";
import { createFakeRunnerEnvironment, type FakeRunnerEnvironment } from "./fakeRunnerEnvironment";

// Test support only: never imported by app code.

/**
 * A fake runner environment whose code really runs: each one evaluates in the global scope of its own fresh jsdom
 * frame, as each run gets its own runner page. Origin checks and the reply port stay the fake's.
 */
export function createRealmRunnerEnvironment(): FakeRunnerEnvironment & { readonly realm: Window; dispose(): void } {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const realm = frame.contentWindow;
  if (realm === null) throw new Error("jsdom gave the frame no window.");
  // The realm's own eval, called indirectly: global-scope evaluation inside that realm (the runner's evaluate.ts does
  // the same in the runner page).
  const realmEval = Reflect.get(realm, "eval") as (source: string) => unknown;
  const fake = createFakeRunnerEnvironment();
  const env: RunnerEnvironment = {
    ...fake.env,
    globals: realm,
    evaluate(source) {
      realmEval(source);
    },
    runScript: (scriptText) => realmEval(entryPointSource(scriptText)),
  };
  return {
    ...fake,
    env,
    realm,
    dispose() {
      frame.remove();
    },
  };
}
