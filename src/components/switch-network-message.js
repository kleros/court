import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Typography } from "antd";
import { chainIdToNetworkName } from "../helpers/networks";

export default function SwitchNetworkMessage({ title, wantedChainId }) {
  return (
    <StyledSwitchNetworkMessage>
      <StyledTitle level={3}>{title}</StyledTitle>
      <StyledParagraph>Please switch to {chainIdToNetworkName[wantedChainId]} to proceed.</StyledParagraph>
    </StyledSwitchNetworkMessage>
  );
}

SwitchNetworkMessage.propTypes = {
  title: t.node.isRequired,
  wantedChainId: t.node.isRequired,
};

const StyledTitle = styled(Typography.Title)``;
const StyledParagraph = styled(Typography.Paragraph)``;

const StyledSwitchNetworkMessage = styled.div`
  text-align: center;

  ${StyledParagraph} {
    color: rgba(0, 0, 0, 0.45);
  }
`;
