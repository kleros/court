import React, { Component } from "react";
import PropTypes from "prop-types";

import { withScope, captureException } from "@sentry/browser";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  componentDidCatch(error, errorInfo) {
    withScope((scope) => {
      Object.keys(errorInfo).forEach((key) => {
        scope.setExtra(key, errorInfo[key]);
      });
      captureException(error);
    });
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }
  render() {
    const { hasError } = this.state;
    const { fallback: Fallback, children } = this.props;
    return hasError ? <Fallback /> : children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
  fallback: PropTypes.any,
};
