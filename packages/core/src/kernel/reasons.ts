/**
 * The `invalid` reasons the kernel itself gives: the fetcher's byte cap, jsonOf and readOptionalString. A module whose
 * own `*_INVALID` list can carry one of these takes it from here, so the spelling has one source.
 */
export const KERNEL_INVALID = ["too-large", "not-json", "not-a-string"] as const;
export type KernelInvalidReason = (typeof KERNEL_INVALID)[number];
