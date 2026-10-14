import ReactDOM from "react-dom";
import React from "react";
import { act } from "react-dom/test-utils";
import { Router } from "react-router-dom";
import { createMemoryHistory } from "history";
import { toPath } from "../helpers/chain-url";

//Renders `renderTree()` inside a memory router at `url` and counts URL replaces.
//A runaway writer replaces the same URL forever, so fail fast past `maxRewrites` instead of hanging the test.
export function mountInRouter(renderTree, { url, maxRewrites = 20 }) {
  const history = createMemoryHistory({ initialEntries: [url] });
  let rewrites = 0;
  history.listen((_, action) => {
    if (action !== "REPLACE") return;
    rewrites += 1;
    if (rewrites > maxRewrites) throw new Error(`URL rewritten more than ${maxRewrites} times: replace loop`);
  });

  const container = document.createElement("div");
  document.body.appendChild(container);
  const render = () => {
    act(() => {
      ReactDOM.render(<Router history={history}>{renderTree()}</Router>, container);
    });
  };
  render();

  return {
    history,
    container,
    rewrites: () => rewrites,
    currentUrl: () => toPath(history.location),
    //Renders again with whatever the mocks return now, like a chainChanged event does. The router keeps its state.
    rerender: render,
    unmount() {
      ReactDOM.unmountComponentAtNode(container);
      container.remove();
    },
  };
}
