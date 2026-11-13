/**
 * The `sandbox` attribute is set before `src`, so the runner document never exists without it, and it grants
 * `allow-scripts` only: an opaque origin on every chain, testnets included (D-18). The caller appends the frame.
 */
export function createRunnerFrame(document: Document, runnerUrl: string): HTMLIFrameElement {
  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-scripts");
  frame.setAttribute("referrerpolicy", "no-referrer");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("tabindex", "-1");
  frame.style.display = "none";
  frame.setAttribute("src", runnerUrl);
  return frame;
}

/** One hidden container for every runner frame, made again if something removed it from the page. */
export function createFrameContainer(document: Document): () => HTMLElement {
  let container: HTMLElement | undefined;
  return () => {
    if (container?.isConnected !== true) {
      container = document.createElement("div");
      container.hidden = true;
      container.setAttribute("aria-hidden", "true");
      document.body.append(container);
    }
    return container;
  };
}
