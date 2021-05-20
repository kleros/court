import React, { PureComponent } from "react";
import * as Sentry from "@sentry/browser";
import { Alert, Button } from "antd";
import styled from "styled-components/macro";
import { ReactComponent as Acropolis } from "../assets/images/acropolis.svg";
import { version } from "../../package.json";
import App from "./app";

export default class SentryApp extends PureComponent {
  state = { error: null };
  componentDidCatch(error, errorInfo) {
    Sentry.withScope((scope) => {
      for (const key of Object.keys(errorInfo)) scope.setExtra(key, errorInfo[key]);
      Sentry.captureException(error);
    });
    this.setState({ error });
  }
  render() {
    const { error } = this.state;
    return error ? (
      <StyledDiv className="quaternary-background theme-background">
        <StyledAcropolis />
        <StyledAlert
          banner
          description={
            <StyledButton onClick={onReportFeedbackClick} type="primary">
              Report Feedback
            </StyledButton>
          }
          message="An unexpected error occurred in Athens."
          type="error"
        />
      </StyledDiv>
    ) : (
      <App />
    );
  }
}

Sentry.init({
  dsn: "https://e8aad23ddbdd41b98dab47bb4c59422c@sentry.io/1412425",
  environment: process.env.REACT_APP_CONTEXT,
  release: `court@${version}`,
});

const onReportFeedbackClick = () => Sentry.showReportDialog();

const StyledDiv = styled.div`
  height: 100vh;
  width: 100vw;
`;

const StyledAcropolis = styled(Acropolis)`
  height: auto;
  width: 100%;
`;

const StyledAlert = styled(Alert)`
  left: 50%;
  position: fixed;
  top: 50%;
  transform: translate(-50%, -50%);

  .ant-alert-message {
    margin-bottom: 20px;
  }
`;

const StyledButton = styled(Button)`
  width: 100%;
`;
