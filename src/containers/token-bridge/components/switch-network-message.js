import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Typography } from "antd";
import { chainIdToNetworkName } from "../../../helpers/networks";

export default function SwitchNetworkMessage({ originToken, destinationChainId }) {
  return (
    <StyledSwitchNetworkMessage>
      <StyledTitle level={3}>
        <span role="img" aria-label="tada">
          🎉
        </span>{" "}
        {originToken} successfully converted!{" "}
        <span role="img" aria-label="tada">
          🎉
        </span>
      </StyledTitle>
      <StyledParagraph>Please switch to {chainIdToNetworkName[destinationChainId]} to proceed.</StyledParagraph>
    </StyledSwitchNetworkMessage>
  );
}

SwitchNetworkMessage.propTypes = {
  originToken: t.node.isRequired,
  destinationChainId: t.node.isRequired,
};

const StyledTitle = styled(Typography.Title)``;
const StyledParagraph = styled(Typography.Paragraph)``;

const StyledSwitchNetworkMessage = styled.div`
  text-align: center;

  ${StyledParagraph} {
    color: rgba(0, 0, 0, 0.45);
  }
`;
