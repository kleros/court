import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components/macro";
import StyledAcropolis from "../components/styled-acropolis";

const ErrorFallbackLayout = ({ children }) => {
  return (
    <StyledDiv>
      <StyledAcropolis />
      <StyledContent>{children}</StyledContent>
    </StyledDiv>
  );
};
export default ErrorFallbackLayout;

ErrorFallbackLayout.propTypes = {
  children: PropTypes.node,
};

const StyledDiv = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.bodyBackground};
`;

const StyledContent = styled.div`
  flex: 1;
  background: ${({ theme }) => theme.bodyBackground};
  padding: 24px;
  text-align: center;
  color: ${({ theme }) => theme.textPrimary};
`;
