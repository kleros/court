/** A place in the queue of runs: `cancel` leaves the queue, or frees the place once the run has started. */
export interface Slot {
  cancel(): void;
}

interface SlotQueue {
  acquire(start: () => void): Slot;
}

type SlotState = "waiting" | "running" | "done";

interface Entry {
  state: SlotState;
  readonly start: () => void;
}

/** At most `limit` runs at once; the others start in the order they asked (a Set keeps insertion order). */
export function createSlotQueue(limit: number): SlotQueue {
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new RangeError(`The runner's concurrency cap must be a positive integer, got ${limit}.`);
  }
  const waiting = new Set<Entry>();
  let running = 0;

  const begin = (entry: Entry): void => {
    running += 1;
    entry.state = "running";
    entry.start();
  };

  const drain = (): void => {
    while (running < limit) {
      const [next] = waiting;
      if (next === undefined) return;
      waiting.delete(next);
      begin(next);
    }
  };

  return {
    acquire(start) {
      const entry: Entry = { state: "waiting", start };
      if (running < limit) begin(entry);
      else waiting.add(entry);
      return {
        cancel() {
          const previous = entry.state;
          entry.state = "done";
          if (previous === "waiting") {
            waiting.delete(entry);
          } else if (previous === "running") {
            running -= 1;
            drain();
          }
        },
      };
    },
  };
}
