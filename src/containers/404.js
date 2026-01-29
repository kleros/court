import { Spin } from "antd";
import { ReactComponent as Acropolis } from "../assets/images/acropolis.svg";
import PropTypes from "prop-types";
import React from "react";
import styled from "styled-components/macro";

export default function C404({ Web3 }) {
  return (
    <StyledDiv Web3={Web3}>
      <StyledAcropolis />
      <StyledInfoDiv>
        <Styled404Div>{Web3 ? "Loading Court" : "404"}</Styled404Div>
        <StyledMessageLine2>
          {Web3 ? "Fetching information about the Court, please wait." : "Something went wrong in Athens!"}
        </StyledMessageLine2>
        {Web3 && <StyledSpin spinning={true}></StyledSpin>}
        <StyledMessageLine3>
          {Web3
            ? "Please make sure you have your wallet unlocked on Mainnet, Gnosis Chain, Sepolia or Chiado. If you don't have a wallet, we recommend you install MetaMask on desktop and Trust on mobile."
            : "The greek gods are not available at the moment."}
        </StyledMessageLine3>
      </StyledInfoDiv>
    </StyledDiv>
  );
}

C404.propTypes = {
  Web3: PropTypes.bool,
};

C404.defaultProps = {
  Web3: false,
};

const StyledDiv = styled.div`
  display: flex;
  flex-direction: column;
  min-height: ${(props) => (props.Web3 ? "100vh" : "calc(100vh - 64px - 56px)")};
  ${(props) => !props.Web3 && "margin: 0 -9.375vw -62px;"}
  background: ${({ theme }) => theme.bodyBackground};
`;

const StyledAcropolis = styled(Acropolis)`
  height: auto;
  width: 100%;

  /* Dark mode SVG color overrides */
  /* Primary purple elements (#4D00B4) - sky and building structure */
  path[fill="#4D00B4"],
  path[fill="#4d00b4"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#2d2541" : "#4D00B4")};
  }

  /* Accent purple (#9013FE) - column details, trees, bushes */
  path[fill="#9013FE"],
  path[fill="#9013fe"],
  ellipse[fill="#9013FE"],
  circle[fill="#9013FE"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#5d4a7a" : "#9013FE")};
  }

  /* Light cliff/mountain colors - gradient from sky to body background */
  /* Lightest cliff - slightly above body background */
  path[fill="#EAE1F2"],
  path[fill="#eae1f2"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#221b2e" : "#EAE1F2")};
  }

  /* Mid-tone cliffs */
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

  /* Corner triangle elements - blend with body background */
  path[fill="#EAD6FE"],
  path[fill="#ead6fe"] {
    fill: ${({ theme }) => theme.bodyBackground};
  }

  /* White elements - clouds, highlights */
  path[fill="white"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "rgba(93, 74, 122, 0.2)" : "white")};
  }
`;

const StyledInfoDiv = styled.div`
  flex: 1;
  padding: 0 9.375vw 62px;
  text-align: center;
  background: ${({ theme }) => theme.bodyBackground};
`;

const Styled404Div = styled.div`
  font-size: 88px;
  font-weight: bold;
  line-height: 112px;
  color: ${({ theme }) => theme.primaryColor};
`;

const StyledMessageLine2 = styled.div`
  font-size: 24px;
  color: ${({ theme }) => theme.textPrimary};
`;

const StyledMessageLine3 = styled.div`
  font-size: 16px;
  margin-top: 25px;
  color: ${({ theme }) => theme.textPrimary};
`;

const StyledSpin = styled(Spin)`
  margin: 16px 0;

  .ant-spin-dot-item {
    background-color: ${({ theme }) => theme.primaryColor};
  }
`;
