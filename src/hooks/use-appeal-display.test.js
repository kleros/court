import React from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { act } from "react-dom/test-utils";
import { useExecutedRuling, useLoserDeadline } from "./use-appeal-display";
import { fetchAppealRules, fetchExecutedRuling } from "../temp/appeal-display-reads";

jest.mock("../temp/appeal-display-reads", () => ({ fetchExecutedRuling: jest.fn(), fetchAppealRules: jest.fn() }));

const dispute = (overrides) => ({
  period: "4",
  ruled: false,
  arbitrated: "0x66260C69d03837016d88c9877e61e08EF74C59F2",
  lastPeriodChange: "1792608005",
  ...overrides,
});

let container;
let results;

const Probe = ({ hook, args }) => {
  results.push(hook(args));
  return null;
};

Probe.propTypes = { hook: PropTypes.func.isRequired, args: PropTypes.object.isRequired };

const render = async (hook, args) => {
  await act(async () => {
    ReactDOM.render(<Probe hook={hook} args={args} />, container);
  });
};

beforeEach(() => {
  results = [];
  container = document.createElement("div");
});

afterEach(() => {
  ReactDOM.unmountComponentAtNode(container);
  jest.resetAllMocks();
});

describe("useExecutedRuling", () => {
  const args = (overrides) => ({
    chainId: 100,
    arbitrator: "0x9C1dA9A04925bDfDedf0f6421bC7EEa8305F9002",
    disputeId: "1042",
    courtRuling: "2",
    lastRound: 0,
    dispute: dispute(overrides),
  });

  it("reads nothing before execution", async () => {
    await render(useExecutedRuling, args());
    expect(results).toEqual([undefined]);
    expect(fetchExecutedRuling).not.toHaveBeenCalled();
  });

  it("is undefined from the first render after execution until the read settles, never a stale value", async () => {
    fetchExecutedRuling.mockResolvedValue({ applied: "1", reasonConfirmed: true });
    await render(useExecutedRuling, args({ ruled: true }));
    expect(fetchExecutedRuling).toHaveBeenCalledWith({
      chainId: 100,
      arbitrator: "0x9c1da9a04925bdfdedf0f6421bc7eea8305f9002",
      disputeId: "1042",
      arbitrable: "0x66260c69d03837016d88c9877e61e08ef74c59f2",
      lastPeriodChange: "1792608005",
      courtRuling: "2",
      lastRound: 0,
    });
    expect(results[0]).toBeUndefined();
    expect(results[results.length - 1]).toEqual({ applied: "1", reasonConfirmed: true });

    // Another dispute: its first render shows nothing, not the previous result.
    results = [];
    fetchExecutedRuling.mockResolvedValue({ applied: "2" });
    await render(useExecutedRuling, { ...args({ ruled: true }), disputeId: "1043" });
    expect(results[0]).toBeUndefined();
    expect(results[results.length - 1]).toEqual({ applied: "2" });
  });
});

describe("useLoserDeadline", () => {
  const args = (overrides) => ({
    chainId: 1,
    courtRuling: "2",
    appealPeriodTime: "302400",
    dispute: dispute({ period: "3", lastPeriodChange: "1643684591", ...overrides }),
  });

  it("is the losing side's deadline of a known contract", async () => {
    fetchAppealRules.mockResolvedValue({ family: "curateClassic" });
    await render(useLoserDeadline, args());
    expect(results[0]).toBeUndefined();
    expect(results[results.length - 1]).toEqual({ known: true, deadline: 1643835791 });
  });

  it("is unknown when the contract's rules can't be known", async () => {
    fetchAppealRules.mockResolvedValue({});
    await render(useLoserDeadline, args());
    expect(results[results.length - 1]).toEqual({ known: false });
  });

  it("reads nothing outside the appeal period", async () => {
    await render(useLoserDeadline, args({ period: "4" }));
    expect(results).toEqual([undefined]);
    expect(fetchAppealRules).not.toHaveBeenCalled();
  });
});
