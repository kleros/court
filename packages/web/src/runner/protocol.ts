// Plain values only: the runner page's bootstrap imports this file, and its bundle must stay free of React, core and
// any other app code.

/** The static runner page (public/__runner/index.html). No app route may answer this path. */
export const RUNNER_PATH = "/__runner/index.html";

export const RUN_MESSAGE_TYPE = "court-runner/run";
export const ACCEPTED_MESSAGE_TYPE = "court-runner/accepted";
export const RESULT_MESSAGE_TYPE = "court-runner/result";
export const ERROR_MESSAGE_TYPE = "court-runner/error";
/** Host to page, on the run's port, once the host has handled the acknowledgement: the page evaluates only then. */
export const START_MESSAGE_TYPE = "court-runner/start";
/**
 * A page and a host of different versions ignore each other: the run then fails on the acknowledgement window.
 * 2 = the page waits for the host's start signal.
 */
export const PROTOCOL_VERSION = 2;

/** At most this many runner frames at once; later runs wait in order (FIFO). */
export const MAX_CONCURRENT_RUNS = 4;
/**
 * How long the host waits for the page's acknowledgement before the run fails, counted from appending the frame and
 * only while no other run is executing (host/ackWindows.ts).
 */
export const ACK_WINDOW_MS = 5_000;
