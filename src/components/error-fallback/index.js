import React from "react";
import { Alert } from "antd";
import ErrorFallbackLayout from "../../containers/error-fallback";
import styled from "styled-components/macro";

const DefaultFallback = () => {
  return (
    <ErrorFallbackLayout>
      <StyledAlert
        banner
        message="An unexpected error occurred in Athens."
        description="Please contact support if the problem persists."
        type="error"
      />
    </ErrorFallbackLayout>
  );
};
export default DefaultFallback;

const StyledAlert = styled(Alert)`
  left: 50%;
  position: fixed;
  top: 50%;
  transform: translate(-50%, -50%);
  background: ${({ theme }) => theme.alertErrorBackground};
  border-color: ${({ theme }) => theme.alertErrorBorder};
  border-radius: 10px;

  .ant-alert-message {
    margin-bottom: 20px;
    color: ${({ theme }) => theme.textPrimary};
  }

  .ant-alert-description {
    color: ${({ theme }) => theme.textSecondary};
  }
`;
