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
});

const render = (period, loserDeadline) => {
  act(() => {
    ReactDOM.render(
      <DisputeTimeline
        period={period}
        lastPeriodChange={lastPeriodChange}
        subcourt={subcourt}
        loserDeadline={loserDeadline}
      />,
      container
    );
  });
  return container.textContent.replace(/\u00a0/g, " ");
};

describe("the losing side's deadline under the appeal countdown", () => {
  it("counts down to it while it is ahead", () => {
    const text = render(3, { known: true, deadline: NOW + 7 * 3600 + 54 * 60 + 30 });
    expect(text).toContain("02d 12h 00m");
    expect(text).toContain("Losing side's deadline: 00d 07h 54m");
  });

  it("says when it has passed", () => {
    expect(render(3, { known: true, deadline: NOW })).toContain("Losing side's deadline: passed");
  });

  it("adds nothing when every side has the same time", () => {
    expect(render(3, { known: true, deadline: null })).not.toMatch(/losing side/i);
  });

  it("adds the general note when the contract is unknown", () => {
    expect(render(3, { known: false })).toContain("The losing side may have less time to fund an appeal than this.");
  });

  it("adds nothing while it is read or outside the appeal period", () => {
    expect(render(3, undefined)).not.toMatch(/losing side/i);
    expect(render(2, { known: false })).not.toMatch(/losing side/i);
  });
});
