import { BudgetExhaustedError } from "./errors.ts";
import type { RequestBudget } from "./types.ts";

/**
 * A count and a deadline for one logical lookup (design parameters: the binding 1,500 requests / 60 s, the Reality
 * lookup 1,500 / 90 s). The deadline starts now. Both are checked before each attempt only, as today: a request already
 * in flight finishes.
 */
export function createRequestBudget(limits: {
  readonly maxRequests: number;
  readonly deadlineMs: number;
}): RequestBudget {
  const deadline = Date.now() + limits.deadlineMs;
  let spent = 0;
  return {
    spend() {
      if (spent >= limits.maxRequests)
        throw new BudgetExhaustedError(`The request budget (${String(limits.maxRequests)} requests) is spent.`);
      if (Date.now() >= deadline)
        throw new BudgetExhaustedError(`The request deadline (${String(limits.deadlineMs)} ms) has passed.`);
      spent += 1;
    },
    get spent() {
      return spent;
    },
    remainingMs() {
      return Math.max(0, deadline - Date.now());
    },
  };
}
