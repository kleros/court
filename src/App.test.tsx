import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { readOnlyWallet } from "./wallet";

describe("App", () => {
  it("shows the court's name", () => {
    render(<App wallet={readOnlyWallet()} />);
    expect(screen.getByRole("heading", { name: "Kleros Court" })).toBeTruthy();
  });
});
