import { describe, expect, it } from "vitest";
import * as core from "../index.ts";
import * as kernel from "./index.ts";

describe("KERNEL_INVALID", () => {
  it("lists the kernel's own invalid reasons, through the kernel and the core exports", () => {
    expect(kernel.KERNEL_INVALID).toEqual(["too-large", "not-json", "not-a-string"]);
    expect(core.KERNEL_INVALID).toBe(kernel.KERNEL_INVALID);
  });
});
