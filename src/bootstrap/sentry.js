import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";
import { version } from "../../package.json";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_ENDPOINT,
  environment: process.env.REACT_APP_CONTEXT,
  release: `court@${version}`,
  integrations: [new BrowserTracing()],
});
