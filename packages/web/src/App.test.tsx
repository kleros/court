import { render, screen } from "@testing-library/react";
import { createMemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { readEnv } from "@court/core";
import { App } from "./App";
import { routes } from "./routes";
import { readOnlyWagmiConfig } from "./wallet/init";

describe("app shell", () => {
  it('renders "Kleros Court" on / with no configuration at all', async () => {
    const wallet = { config: readOnlyWagmiConfig(readEnv({})), canConnect: false };
    render(<App wallet={wallet} router={createMemoryRouter(routes, { initialEntries: ["/"] })} />);
    expect(await screen.findByRole("heading", { name: "Kleros Court" })).toBeTruthy();
  });

  it("renders a not-found page for an unknown path", async () => {
    const wallet = { config: readOnlyWagmiConfig(readEnv({})), canConnect: false };
    render(<App wallet={wallet} router={createMemoryRouter(routes, { initialEntries: ["/nope/x"] })} />);
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeTruthy();
  });
});
