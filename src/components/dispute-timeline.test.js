import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import DisputeTimeline from "./dispute-timeline";

const NOW = 1800000000;
// A 3.5 day appeal period that started a day ago.
const subcourt = { timesPerPeriod: [86400, 0, 86400, 302400], hiddenVotes: false };
const lastPeriodChange = String(NOW - 86400);

let container;

beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(NOW * 1000);
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  ReactDOM.unmountComponentAtNode(container);
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  jest.useRealTimers();
});

const render = (period, loserDeadline, periodStart = lastPeriodChange, court = subcourt) => {
  act(() => {
    ReactDOM.render(
      <DisputeTimeline period={period} lastPeriodChange={periodStart} subcourt={court} loserDeadline={loserDeadline} />,
      container
    );
  });
  return container.textContent.replace(/\u00a0/g, " ");
};

describe("the losing side's deadline below the timeline", () => {
  it("counts down to it while it is ahead", () => {
    const text = render(3, { known: true, deadline: NOW + 7 * 3600 + 54 * 60 + 30 });
    expect(text).toContain("02d 12h 00m");
    expect(text).toContain(
      "Losing side: 00d 07h 54m left to fund an appeal. The winning side has until the period ends."
    );
    expect(container.textContent).toContain("00d\u00a007h\u00a054m");
  });

  it("says when it has passed", () => {
    expect(render(3, { known: true, deadline: NOW })).toContain(
      "Losing side: deadline passed. The winning side has until the period ends."
    );
  });

  it("adds nothing when every side has the same time", () => {
    expect(render(3, { known: true, deadline: null })).not.toMatch(/losing side/i);
  });

  it("adds the general note when the contract is unknown", () => {
    expect(render(3, { known: false })).toContain(
      "The losing side may have less time to fund an appeal than the full period."
    );
  });

  it("adds nothing once the appeal period is over, even before it is passed on chain", () => {
    const ended = String(NOW - 302400);
    expect(render(3, { known: true, deadline: NOW - 151200 }, ended)).not.toMatch(/losing side/i);
    expect(render(3, { known: false }, ended)).not.toMatch(/losing side/i);
  });

  it("follows the period end when the court's appeal time is extended after it passed", () => {
    jest.useFakeTimers();
    const ended = String(NOW - 302400);
    const passed = { known: true, deadline: NOW - 151200 };
    const extended = { ...subcourt, timesPerPeriod: [86400, 0, 86400, 302400 + 3600] };
    expect(render(3, passed, ended)).not.toMatch(/losing side/i);
    expect(render(3, passed, ended, extended)).toContain("00d 01h 00m");
    expect(container.textContent).toMatch(/losing side: deadline passed/i);

    Date.now.mockReturnValue((NOW + 120) * 1000);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(container.textContent.replace(/\u00a0/g, " ")).toContain("00d 00h 58m");

    Date.now.mockReturnValue((NOW + 3601) * 1000);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(container.textContent).not.toMatch(/losing side/i);
  });

  it("adds nothing while it is read or outside the appeal period", () => {
    expect(render(3, undefined)).not.toMatch(/losing side/i);
    expect(render(2, { known: false })).not.toMatch(/losing side/i);
  });
});
