import React from "react";
import PropTypes from "prop-types";

import styled from "styled-components/macro";
import { ReactComponent as Acropolis } from "../assets/images/acropolis.svg";

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

const StyledAcropolis = styled(Acropolis)`
  height: auto;
  width: 100%;

  /* Dark mode SVG color overrides */
  path[fill="#4D00B4"],
  path[fill="#4d00b4"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#2d2541" : "#4D00B4")};
  }

  path[fill="#9013FE"],
  path[fill="#9013fe"],
  ellipse[fill="#9013FE"],
  circle[fill="#9013FE"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#5d4a7a" : "#9013FE")};
  }

  path[fill="#EAE1F2"],
  path[fill="#eae1f2"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#221b2e" : "#EAE1F2")};
  }

  path[fill="#CEC2DA"],
  path[fill="#cec2da"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#1e1828" : "#CEC2DA")};
  }

  path[fill="#C7B9D4"],
  path[fill="#c7b9d4"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#1c1626" : "#C7B9D4")};
  }

  path[fill="#DFD1EC"],
  path[fill="#dfd1ec"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#201a2a" : "#DFD1EC")};
  }

  path[fill="#EAD6FE"],
  path[fill="#ead6fe"] {
    fill: ${({ theme }) => theme.bodyBackground};
  }

  path[fill="white"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "rgba(93, 74, 122, 0.2)" : "white")};
  }
`;
