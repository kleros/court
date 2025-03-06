import React from "react";
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";
import { version } from "../../package.json";
import App from "./app";
import DefaultFallback from "../components/error-fallback";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_ENDPOINT,
  environment: process.env.REACT_APP_CONTEXT,
  release: `court@${version}`,
  integrations: [new BrowserTracing()],
});

Sentry.withErrorBoundary(App, { fallback: <DefaultFallback onClick={Sentry.showReportDialog} /> });
