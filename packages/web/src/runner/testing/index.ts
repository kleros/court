// Test support for the runner's unit tests only: never imported by app code.
export {
  ACCEPTED,
  FAKE_APP_ORIGIN,
  OLD_RPC_URL,
  SAMPLE_PARAMS,
  SAMPLE_REDIRECTS,
  START,
  createFakeRunnerEnvironment,
  runRequest,
  type FakeRunnerEnvironment,
  type ScriptApi,
} from "./fakeRunnerEnvironment";
export {
  createFakeRunnerDocument,
  settleMacrotasks,
  type FakeRunnerDocument,
  type FakeRunnerFrame,
  type PostedRun,
} from "./fakeRunnerDocument";
export { createRealmRunnerEnvironment } from "./realm";
export { loadLegacyDuplicateKeyGuard } from "./legacyGuard";
