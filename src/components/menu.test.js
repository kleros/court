import React from "react";
import { DesktopMenu, menuKeyForPath } from "./menu";
import useChainId from "../hooks/use-chain-id";
import { mountInRouter } from "../test-utils/memory-router";

jest.mock("../hooks/use-chain-id", () => ({ __esModule: true, default: jest.fn() }));

describe("menuKeyForPath", () => {
  it.each([
    ["/1/", "home"],
    ["/1", "home"],
    ["/100/courts", "courts"],
    ["/100/courts/", "courts"],
    ["/1/cases", "cases"],
    ["/1/cases/5", "cases"],
    ["/100/cases/abc", "cases"],
    ["/1/tokens", null],
    ["/foo", null],
    ["/999/cases/1", null],
    ["/", "home"],
    ["/courts", "courts"],
  ])("%p selects %p", (pathname, key) => {
    expect(menuKeyForPath(pathname)).toBe(key);
  });
});

describe("DesktopMenu", () => {
  it("selects the page under a prefix, and links to the connected chain", () => {
    useChainId.mockReturnValue(1);
    const page = mountInRouter(() => <DesktopMenu />, { url: "/100/courts" });

    expect(page.container.querySelector(".ant-menu-item-selected").textContent).toBe("Courts");
    const home = [...page.container.querySelectorAll("a")].find((a) => a.textContent === "Home");
    expect(home.getAttribute("href")).toBe("/1/");

    page.unmount();
  });
});
