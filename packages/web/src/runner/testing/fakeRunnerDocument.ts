// Test support only: never imported by app code.

export interface PostedRun {
  readonly message: unknown;
  readonly targetOrigin: unknown;
  readonly ports: readonly MessagePort[];
  /** What the host sent on the port, delivered as the page would receive it. */
  readonly received: unknown[];
  reply(data: unknown): void;
  acknowledge(): void;
}

/** A runner frame the host created, driven by the test instead of a real runner page (jsdom never loads one). */
export interface FakeRunnerFrame {
  readonly element: HTMLIFrameElement;
  /** Every attribute the host set, in order, observed as DOM mutations, so a test can check `sandbox` precedes `src`. */
  attributeOrder(): string[];
  watchPosts(): PostedRun[];
  load(): PostedRun;
}

export interface FakeRunnerDocument {
  readonly document: Document;
  readonly frames: FakeRunnerFrame[];
  attachedFrames(): FakeRunnerFrame[];
}

function isMessagePort(value: unknown): value is MessagePort {
  return value instanceof MessagePort;
}

function fakeFrame(element: HTMLIFrameElement): FakeRunnerFrame {
  const attributes: string[] = [];
  const observer = new MutationObserver((records) => {
    attributes.push(...records.flatMap((record) => (record.attributeName === null ? [] : [record.attributeName])));
  });
  observer.observe(element, { attributes: true });
  let posts: PostedRun[] | undefined;

  const watchPosts = (): PostedRun[] => {
    if (posts !== undefined) return posts;
    const target = element.contentWindow;
    if (target === null) throw new Error("The host has not attached the frame.");
    const recorded: PostedRun[] = [];
    target.postMessage = (message: unknown, targetOrigin?: unknown, transfer?: unknown) => {
      const ports = Array.isArray(transfer) ? transfer.filter(isMessagePort) : [];
      const received: unknown[] = [];
      for (const port of ports) {
        port.onmessage = (event: MessageEvent<unknown>) => {
          received.push(event.data);
        };
      }
      const reply = (data: unknown): void => {
        const [port] = ports;
        if (port === undefined) throw new Error("The host transferred no port.");
        port.postMessage(data);
      };
      recorded.push({
        message,
        targetOrigin,
        ports,
        received,
        reply,
        acknowledge() {
          reply({ type: "court-runner/accepted" });
        },
      });
    };
    posts = recorded;
    return recorded;
  };

  return {
    element,
    attributeOrder() {
      attributes.push(
        ...observer.takeRecords().flatMap((record) => (record.attributeName === null ? [] : [record.attributeName])),
      );
      return [...attributes];
    },
    watchPosts,
    load() {
      const recorded = watchPosts();
      const before = recorded.length;
      element.dispatchEvent(new Event("load"));
      const posted = recorded.slice(before);
      const [only] = posted;
      if (only === undefined || posted.length !== 1)
        throw new Error(`Expected one post on load, got ${posted.length}.`);
      return only;
    },
  };
}

/**
 * A document for `createIframeScriptRunner` whose iframes are real jsdom elements the test drives: it fires their
 * `load` events and answers on the transferred ports. Only `createElement` and `body` are used by the host.
 */
export function createFakeRunnerDocument(): FakeRunnerDocument {
  const frames: FakeRunnerFrame[] = [];
  const fake = {
    get body() {
      return document.body;
    },
    createElement(tagName: string) {
      const element = document.createElement(tagName);
      if (element instanceof HTMLIFrameElement) frames.push(fakeFrame(element));
      return element;
    },
  };
  return {
    document: fake as unknown as Document,
    frames,
    attachedFrames: () => frames.filter((frame) => frame.element.isConnected),
  };
}

/** Lets pending port messages, promise callbacks and immediate timers run. */
export async function settleMacrotasks(): Promise<void> {
  for (let turn = 0; turn < 5; turn += 1) {
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
  }
}
