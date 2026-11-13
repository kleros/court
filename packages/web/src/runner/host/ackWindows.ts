/** One frame's acknowledgement window. */
export interface AckWindow {
  /** The page acknowledged: the window closes and the run counts as executing. True the first time only. */
  accept(): boolean;
  /** The run settled, however: the window closes, or the run stops counting as executing. */
  close(): void;
}

interface Waiting {
  readonly onExpire: () => void;
  timer: ReturnType<typeof setTimeout> | undefined;
}

/**
 * Acknowledgement windows that count only while no run is executing (between its acknowledgement and its settle).
 * Runner frames share one thread with each other, and on Firefox, Safari and Chromium's headless shell with the app
 * too, so another run's script delays a frame's load and the host's handling of its acknowledgement; counted, that
 * time would end healthy runs as runner-error. A window restarts in full when the last executing run ends: no clock
 * to read, and a runner page that really cannot load still fails within one window once nothing else runs.
 */
export function createAckWindows(windowMs: number): { open(onExpire: () => void): AckWindow } {
  const waiting = new Set<Waiting>();
  let executing = 0;

  const arm = (entry: Waiting): void => {
    entry.timer = setTimeout(entry.onExpire, windowMs);
  };
  const disarm = (entry: Waiting): void => {
    clearTimeout(entry.timer);
    entry.timer = undefined;
  };

  return {
    open(onExpire) {
      const entry: Waiting = { onExpire, timer: undefined };
      let state: "waiting" | "executing" | "closed" = "waiting";
      waiting.add(entry);
      if (executing === 0) arm(entry);
      return {
        accept() {
          if (state !== "waiting") return false;
          state = "executing";
          disarm(entry);
          waiting.delete(entry);
          executing += 1;
          if (executing === 1) waiting.forEach(disarm);
          return true;
        },
        close() {
          if (state === "waiting") {
            disarm(entry);
            waiting.delete(entry);
          } else if (state === "executing") {
            executing -= 1;
            if (executing === 0) waiting.forEach(arm);
          }
          state = "closed";
        },
      };
    },
  };
}
