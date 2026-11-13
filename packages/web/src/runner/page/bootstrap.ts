import type { ScriptParameters } from "@court/core";
import { ACCEPTED_MESSAGE_TYPE, ERROR_MESSAGE_TYPE, RESULT_MESSAGE_TYPE, START_MESSAGE_TYPE } from "../protocol";
import type { ReplyPort, RunnerEnvironment, RunnerMessageEvent, RunnerRequestMessage } from "../types";
import { parseRunRequest } from "./request";
import { installRpcRedirect } from "./rpcRedirect";

const OPAQUE_ORIGIN = "null";
const NOT_CLONEABLE = "The script's result cannot be copied out of the runner.";
const UNDESCRIBED_FAILURE = "The script reported a failure.";
/** Set by the duplicate-key guard when JSON.parse met a repeated key (02.3.5). */
const DUPLICATE_KEYS_FLAG = "__klerosJsonDuplicateKeys";

interface AcceptedRun {
  readonly request: RunnerRequestMessage;
  readonly port: ReplyPort;
}

interface Reporter {
  resolve(value: unknown): void;
  reject(reason: unknown): void;
}

/** Sandboxed (opaque origin) and inside a frame: anything else is the page opened directly or framed without its sandbox. */
function isSandboxedFrame(env: RunnerEnvironment): boolean {
  return env.selfOrigin === OPAQUE_ORIGIN && !env.isTopLevel;
}

/**
 * Only the parent window may start a run, from the runner URL's own origin (the app's: an opaque document still reports
 * its URL's origin through `location.origin`), with exactly one transferred port and a well-formed request.
 */
function acceptRun(env: RunnerEnvironment, event: RunnerMessageEvent): AcceptedRun | undefined {
  if (event.source !== env.parent || env.locationOrigin === OPAQUE_ORIGIN || event.origin !== env.locationOrigin) {
    return undefined;
  }
  const [port, ...extraPorts] = event.ports;
  if (port === undefined || extraPorts.length > 0) return undefined;
  const request = parseRunRequest(event.data);
  if (request === undefined) return undefined;
  return { request, port };
}

function isStartSignal(data: unknown): boolean {
  return typeof data === "object" && data !== null && Reflect.get(data, "type") === START_MESSAGE_TYPE;
}

function describeFailure(reason: unknown): string {
  if (typeof reason === "string") return reason;
  try {
    const message: unknown = typeof reason === "object" && reason !== null ? Reflect.get(reason, "message") : undefined;
    if (typeof message === "string") return message;
  } catch {
    // A hostile reason (a throwing getter or proxy trap) is described generically.
  }
  return UNDESCRIBED_FAILURE;
}

/**
 * Posts the first resolve or reject only. The duplicate-key flag is read when posting, so it reaches the host with a
 * result and with a failure alike (02.3.5: the guard's throw may be what made the script fail).
 */
function createReporter(globals: object, port: ReplyPort): Reporter {
  let settled = false;
  const duplicateKeys = (): boolean => Reflect.get(globals, DUPLICATE_KEYS_FLAG) === true;
  const postError = (reason: unknown): void => {
    port.postMessage({
      type: ERROR_MESSAGE_TYPE,
      message: describeFailure(reason),
      jsonDuplicateKeys: duplicateKeys(),
    });
  };
  const postResult = (value: unknown): void => {
    try {
      port.postMessage({ type: RESULT_MESSAGE_TYPE, value, jsonDuplicateKeys: duplicateKeys() });
    } catch {
      postError(NOT_CLONEABLE);
    }
  };
  return {
    resolve(value) {
      if (settled) return;
      settled = true;
      Promise.resolve(value).then(postResult, postError);
    },
    reject(reason) {
      if (settled) return;
      settled = true;
      postError(reason);
    },
  };
}

function defineFixedGlobal(globals: object, name: string, value: unknown): void {
  Object.defineProperty(globals, name, { value, writable: false, configurable: false, enumerable: true });
}

/**
 * Today's frame declared these as bindings of the script's own `<script>` (02.3.4): the script reads them by name and
 * gets its own parameter object, which it may write to, so the copy is not frozen.
 */
function defineScriptGlobals(globals: object, params: ScriptParameters, reporter: Reporter): void {
  defineFixedGlobal(globals, "scriptParameters", { ...params });
  defineFixedGlobal(globals, "resolveScript", (value: unknown) => {
    reporter.resolve(value);
  });
  defineFixedGlobal(globals, "rejectScript", (reason: unknown) => {
    reporter.reject(reason);
  });
}

function run(env: RunnerEnvironment, { request, port }: AcceptedRun): void {
  const reporter = createReporter(env.globals, port);
  try {
    defineScriptGlobals(env.globals, request.params, reporter);
    installRpcRedirect(env.network, request.rpcRedirects);
    if (request.guardSource !== null) env.evaluate(request.guardSource);
    const returned = env.runScript(request.scriptText);
    // Today's scripts are mostly async functions: a throw inside one rejects the promise it returns. That failure is
    // reported at once like a synchronous throw, instead of waiting for the host's timeout. A value it returns is not a
    // result: only resolveScript posts one.
    Promise.resolve(returned).catch((error: unknown) => {
      reporter.reject(error);
    });
  } catch (error) {
    reporter.reject(error);
  }
}

/**
 * The runner page's whole behaviour (D-18): one run per frame, acknowledged on its port, evaluated only once the host's
 * start signal comes back on that port. A refused request gets nothing, not even an acknowledgement, so no window
 * learns whether a runner is alive; results leave only through the request's port.
 */
export function bootstrapRunner(env: RunnerEnvironment): void {
  if (!isSandboxedFrame(env)) return;
  let accepted = false;
  const removeListener = env.addMessageListener((event) => {
    if (accepted) return;
    const acceptedRun = acceptRun(env, event);
    if (acceptedRun === undefined) return;
    accepted = true;
    removeListener();
    const { port } = acceptedRun;
    // Runner frames share a thread with each other (and on some engines with the app): a script evaluated right after
    // the acknowledgement could hold the host's handling of it, and other frames' loads, past the window.
    port.onmessage = (portEvent) => {
      if (!isStartSignal(portEvent.data)) return;
      port.onmessage = null;
      run(env, acceptedRun);
    };
    port.postMessage({ type: ACCEPTED_MESSAGE_TYPE });
  });
}
