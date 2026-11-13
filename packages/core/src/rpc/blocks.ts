import { succeed, type Failure, type Outcome, type ReadClient } from "../kernel/index.ts";
import { toReadFailure } from "./errors.ts";

/**
 * The Unix time (seconds) of each distinct block, read `concurrency` at a time (default 6). All or nothing: one failed
 * read makes the answer unavailable and starts no further reads. A block's time never changes, so callers may keep it.
 */
export async function readBlockTimes(
  client: ReadClient,
  blocks: readonly bigint[],
  options: { readonly concurrency?: number } = {},
): Promise<Outcome<ReadonlyMap<bigint, number>>> {
  const pending = [...new Set(blocks)];
  const times = new Map<bigint, number>();
  let failure: Failure | undefined;
  const worker = async (): Promise<void> => {
    for (let block = pending.shift(); block !== undefined && failure === undefined; block = pending.shift()) {
      try {
        const { timestamp } = await client.getBlock({ blockNumber: block });
        times.set(block, Number(timestamp));
      } catch (error) {
        failure ??= toReadFailure(error, `the time of block ${String(block)}`);
      }
    }
  };
  const workers = Math.min(options.concurrency ?? 6, pending.length);
  await Promise.all(Array.from({ length: workers }, worker));
  return failure === undefined ? succeed(times) : { ok: false, failure };
}
