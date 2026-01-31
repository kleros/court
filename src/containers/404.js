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

  @media (max-width: 768px) {
    ${(props) => !props.Web3 && "margin: 0 -16px -62px;"}
  }
`;

const StyledAcropolis = styled(Acropolis)`
  height: auto;
  width: 100%;

  /* Dark mode SVG color overrides */
  /* Primary purple (#4D00B4) - sky and main structure */
  path[fill="#4D00B4"],
  path[fill="#4d00b4"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#1e1632" : "#4D00B4")};
  }
  path[stroke="#4D00B4"],
  path[stroke="#4d00b4"] {
    stroke: ${({ theme }) => (theme.name === "dark" ? "#1e1632" : "#4D00B4")};
  }

  /* Accent purple (#9013FE) - temple columns, trees, details */
  path[fill="#9013FE"],
  path[fill="#9013fe"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#4a3d66" : "#9013FE")};
  }

  /* Cliff colors - dark gradient with subtle depth */
  path[fill="#EAE1F2"],
  path[fill="#eae1f2"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#262038" : "#EAE1F2")};
  }

  path[fill="#DFD1EC"],
  path[fill="#dfd1ec"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#221b30" : "#DFD1EC")};
  }

  path[fill="#CEC2DA"],
  path[fill="#cec2da"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#1e1829" : "#CEC2DA")};
  }

  path[fill="#C7B9D4"],
  path[fill="#c7b9d4"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#1b1524" : "#C7B9D4")};
  }

  /* Corner triangles - match body background */
  path[fill="#EAD6FE"],
  path[fill="#ead6fe"] {
    fill: ${({ theme }) => theme.bodyBackground};
  }

  /* Clouds and highlights */
  path[fill="white"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "rgba(74, 61, 102, 0.15)" : "white")};
  }

  /* Gradient elements - darken in dark mode */
  path[fill^="url(#paint"] {
    ${({ theme }) => theme.name === "dark" && "filter: brightness(0.25) saturate(0.8);"}
  }
`;

const StyledInfoDiv = styled.div`
  flex: 1;
  padding: 0 9.375vw 62px;
  text-align: center;
  background: ${({ theme }) => theme.bodyBackground};

  @media (max-width: 768px) {
    padding: 0 16px 62px;
  }
`;

const Styled404Div = styled.div`
  font-size: 88px;
  font-weight: bold;
  line-height: 112px;
  color: ${({ theme }) => theme.pageTitle};
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
    background-color: ${({ theme }) => theme.accentPurple};
  }
`;
