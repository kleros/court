import React from "react";
import PropTypes from "prop-types";

import styled from "styled-components/macro";
import { ReactComponent as Acropolis } from "../assets/images/acropolis.svg";

const ErrorFallbackLayout = ({ children }) => {
  return (
    <StyledDiv className="quaternary-background theme-background">
      <StyledAcropolis />
      {children}
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
`;

const StyledAcropolis = styled(Acropolis)`
  height: auto;
  width: 100%;
`;
