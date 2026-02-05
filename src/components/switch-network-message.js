import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Button, Icon, Typography } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { isSupportedSideChain, SideChainApiProvider, useSideChainApi } from "../api/side-chain";
import { chainIdToNetworkName } from "../helpers/networks";

const { useDrizzle } = drizzleReactHooks;

export default function SwitchNetworkMessage({ title, wantedChainId, showSwitchButton }) {
  const isSupported = isSupportedSideChain(wantedChainId);
  const { drizzle } = useDrizzle();

  return (
    <StyledSwitchNetworkMessage>
      <StyledTitle level={3}>{title}</StyledTitle>
      <StyledParagraph>Please switch to {chainIdToNetworkName[wantedChainId]} to proceed.</StyledParagraph>
      {showSwitchButton && isSupported ? (
        <SideChainApiProvider web3Provider={drizzle.web3.currentProvider} renderOnLoading={null}>
          <SwitchNetworkButton />
        </SideChainApiProvider>
      ) : null}
    </StyledSwitchNetworkMessage>
  );
}

SwitchNetworkMessage.propTypes = {
  title: t.node.isRequired,
  wantedChainId: t.node.isRequired,
  showSwitchButton: t.bool,
};

SwitchNetworkMessage.defaultProps = {
  showSwitchButton: false,
};

function SwitchNetworkButton() {
  const tokenBridgeApi = useSideChainApi();

  return (
    <Button
      type="primary"
      onClick={async () => {
        try {
          tokenBridgeApi.destination.switchChain();
        } catch {
          // do nothing..
        }
      }}
    >
      <span>Switch Network</span>
      <Icon type="arrow-right" />
    </Button>
  );
}

const StyledTitle = styled(Typography.Title)``;
const StyledParagraph = styled(Typography.Paragraph)``;

const StyledSwitchNetworkMessage = styled.div`
  text-align: center;

  ${StyledParagraph} {
    color: ${({ theme }) => theme.textLight};
  }
`;
