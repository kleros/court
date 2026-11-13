import type { ScriptRunRequest, ScriptRunResult, ScriptRunner } from "@court/core";
import { ACK_WINDOW_MS, MAX_CONCURRENT_RUNS, RUNNER_PATH, START_MESSAGE_TYPE } from "../protocol";
import type { IframeRunnerOptions, RunnerRequestMessage } from "../types";
import { createAckWindows, type AckWindow } from "./ackWindows";
import { createFrameContainer, createRunnerFrame } from "./frame";
import { MALFORMED_REPLY, hostFailure, parsePortMessage } from "./parseReply";
import { createSlotQueue, type Slot } from "./slots";
import { buildRunMessage } from "./validateRequest";

/** `setTimeout` fires at once for delays above this, so longer budgets are clipped to it. */
const MAX_TIMER_DELAY_MS = 2_147_483_647;

const INVALID_REQUEST = hostFailure("runner-error", "The dynamic script's request is invalid.");
const ABORTED = hostFailure("aborted", "The dynamic script run was aborted.");
const NO_FRAME = hostFailure("runner-error", "The script runner frame could not be opened.");
const START_MESSAGE = { type: START_MESSAGE_TYPE };

interface FrameSetup {
  readonly document: Document;
  readonly runnerUrl: string;
  readonly ackWindowMs: number;
  readonly ackWindows: { open(onExpire: () => void): AckWindow };
}

/** Never throws, so `run` never rejects. */
function safeRunMessage(request: ScriptRunRequest): RunnerRequestMessage | undefined {
  try {
    return buildRunMessage(request);
  } catch {
    return undefined;
  }
}

/**
 * Appends one runner frame, posts the run on its `load` with a fresh port, answers the acknowledgement with the start
 * signal, and settles from that port only (the host has no window message listener). Returns the teardown: window
 * closed, port closed, frame removed.
 */
function openFrame(
  container: HTMLElement,
  setup: FrameSetup,
  message: RunnerRequestMessage,
  settle: (result: ScriptRunResult) => void,
): () => void {
  const frame = createRunnerFrame(setup.document, setup.runnerUrl);
  let port: MessagePort | undefined;

  // Opened at the append, not at `load`, which a blocked or cancelled frame navigation may never fire.
  const ackWindow = setup.ackWindows.open(() => {
    settle(
      hostFailure(
        "runner-error",
        `The script runner did not start within ${setup.ackWindowMs / 1000} seconds; a content blocker may be stopping the page from loading it.`,
      ),
    );
  });

  const onLoad = (): void => {
    const target = frame.contentWindow;
    if (target === null) {
      settle(NO_FRAME);
      return;
    }
    const channel = new MessageChannel();
    const replyPort = channel.port1;
    port = replyPort;
    replyPort.onmessage = (event: MessageEvent<unknown>) => {
      const reply = parsePortMessage(event.data);
      if (reply.kind === "settled") settle(reply.result);
      // The page evaluates only on this signal, so its script never runs before its window is closed and the other
      // windows are stopped (ackWindows.ts).
      else if (ackWindow.accept()) replyPort.postMessage(START_MESSAGE);
    };
    port.onmessageerror = () => {
      settle(MALFORMED_REPLY);
    };
    // An opaque-origin frame accepts no other target origin; the reply can only come back through the transferred port.
    target.postMessage(message, "*", [channel.port2]);
  };

  frame.addEventListener("load", onLoad, { once: true });
  container.append(frame);

  return () => {
    ackWindow.close();
    frame.removeEventListener("load", onLoad);
    if (port !== undefined) {
      port.onmessage = null;
      port.onmessageerror = null;
      port.close();
    }
    frame.remove();
  };
}

/**
 * The app's ScriptRunner (D-18): each run in its own runner frame, at most `maxConcurrent` at once (later runs wait in
 * order). A run's timeout counts from the call, so time spent waiting counts against it. Never rejects.
 */
export function createIframeScriptRunner(options: IframeRunnerOptions): ScriptRunner {
  const ackWindowMs = options.ackWindowMs ?? ACK_WINDOW_MS;
  const setup: FrameSetup = {
    document: options.document,
    runnerUrl: options.runnerUrl ?? RUNNER_PATH,
    ackWindowMs,
    ackWindows: createAckWindows(ackWindowMs),
  };
  const queue = createSlotQueue(options.maxConcurrent ?? MAX_CONCURRENT_RUNS);
  const container = createFrameContainer(options.document);

  const run = (request: ScriptRunRequest): Promise<ScriptRunResult> =>
    new Promise<ScriptRunResult>((resolve) => {
      const message = safeRunMessage(request);
      if (message === undefined) {
        resolve(INVALID_REQUEST);
        return;
      }
      if (request.signal?.aborted === true) {
        resolve(ABORTED);
        return;
      }
      const timedOut = hostFailure("timeout", `The dynamic script for dispute ${message.params.disputeID} timed out.`);
      if (Number.isNaN(request.timeoutMs) || request.timeoutMs <= 0) {
        resolve(timedOut);
        return;
      }

      let settled = false;
      let teardown: (() => void) | undefined;

      const onAbort = (): void => {
        settle(ABORTED);
      };
      const timer = setTimeout(
        () => {
          settle(timedOut);
        },
        Math.min(request.timeoutMs, MAX_TIMER_DELAY_MS),
      );

      function settle(result: ScriptRunResult): void {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        request.signal?.removeEventListener("abort", onAbort);
        teardown?.();
        slot.cancel();
        resolve(result);
      }

      request.signal?.addEventListener("abort", onAbort, { once: true });
      // `settle` runs only from asynchronous callbacks (load, port, timers, abort), so `slot` is always set by then.
      const slot: Slot = queue.acquire(() => {
        try {
          teardown = openFrame(container(), setup, message, settle);
        } catch {
          // Settled on the next microtask, once the place this callback runs in has been handed back.
          queueMicrotask(() => {
            settle(NO_FRAME);
          });
        }
      });
    });

  return { run };
}
