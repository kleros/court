import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Alert, Button, Icon } from "antd";
import { Link } from "react-router-dom";
import { chainIdToNetworkName } from "../../../helpers/networks";

export default function ReadyToUse({ wantedChainId, currentChainId }) {
  return wantedChainId === currentChainId ? (
    <StyledWrapper>
      <Link to="/">
        <Button type="link">
          Checkout Court on {chainIdToNetworkName[wantedChainId]}
          <Icon type="arrow-right" />
        </Button>
      </Link>
    </StyledWrapper>
  ) : (
    <Alert
      showIcon
      type="warning"
      message="Looks like you are on the wrong chain."
      description={`Please switch to ${chainIdToNetworkName[wantedChainId]}.`}
    />
  );
}

ReadyToUse.propTypes = {
  wantedChainId: t.number.isRequired,
  currentChainId: t.number.isRequired,
};

const StyledWrapper = styled.div`
  text-align: center;
`;
