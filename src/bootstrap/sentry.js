import React, { PureComponent } from "react";
import { init as sentryInit, showReportDialog } from "@sentry/browser";
import { version } from "../../package.json";
import App from "./app";
import ErrorBoundary from "../components/error-boundary";
import DefaultFallback from "../components/error-fallback";

export default class SentryApp extends PureComponent {
  render() {
    return (
      <ErrorBoundary fallback={fallback}>
        <App />
      </ErrorBoundary>
    );
  }
}

const fallback = () => <DefaultFallback onClick={showReportDialog} />;

sentryInit({
  dsn: "https://e8aad23ddbdd41b98dab47bb4c59422c@sentry.io/1412425",
  environment: process.env.REACT_APP_CONTEXT,
  release: `court@${version}`,
});
