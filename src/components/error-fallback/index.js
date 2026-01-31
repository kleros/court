import React from "react";
import { Alert, Button } from "antd";
import PropTypes from "prop-types";

import ErrorFallbackLayout from "../../containers/error-fallback";
import styled from "styled-components/macro";

const DefaultFallback = ({ onClick }) => {
  return (
    <ErrorFallbackLayout>
      <StyledAlert
        banner
        description={
          <StyledButton onClick={onClick} type="primary">
            Report Feedback
          </StyledButton>
        }
        message="An unexpected error occurred in Athens."
        type="error"
      />
    </ErrorFallbackLayout>
  );
};
export default DefaultFallback;

DefaultFallback.propTypes = {
  onClick: PropTypes.func,
};

const StyledAlert = styled(Alert)`
  left: 50%;
  position: fixed;
  top: 50%;
  transform: translate(-50%, -50%);
  background: ${({ theme }) => theme.alertErrorBackground};
  border-color: ${({ theme }) => theme.alertErrorBorder};

  .ant-alert-message {
    margin-bottom: 20px;
    color: ${({ theme }) => theme.textPrimary};
  }

  .ant-alert-description {
    color: ${({ theme }) => theme.textSecondary};
  }
`;

const StyledButton = styled(Button)`
  width: 100%;
  height: 50px;
  font-size: 20px;
  background: ${({ theme }) => theme.primaryColor};
  border-color: ${({ theme }) => theme.primaryColor};
  color: ${({ theme }) => theme.primaryButtonText};

  &:hover,
  &:focus {
    background: ${({ theme }) => theme.primaryColor};
    border-color: ${({ theme }) => theme.primaryColor};
    color: ${({ theme }) => theme.primaryButtonText};
    filter: brightness(1.1);
  }
`;
