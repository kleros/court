import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { Button, Modal, Typography } from "antd";
import { chainIdToNetworkName } from "../helpers/networks";
import { SideChainApiProvider, useSideChainApi, isSupportedSideChain, isSupportedMainChain } from "../api/side-chain";
import { useCleanRequiredChainId } from "./required-chain-id-gateway";

const { useDrizzle } = drizzleReactHooks;

export default function RequiredChainIdModal({ requiredChainId }) {
  const { drizzle } = useDrizzle();

  const cleanRequiredChainId = useCleanRequiredChainId();

  return (
    <SideChainApiProvider web3Provider={drizzle.web3.currentProvider}>
      <StyledModal
        visible
        centered
        width={640}
        footer={
          isSupportedSideChain(requiredChainId) ? <SwitchNetworkButton requiredChainId={requiredChainId} /> : null
        }
        title={<>Switch to {chainIdToNetworkName[requiredChainId]}</>}
        onCancel={() => cleanRequiredChainId()}
      >
        {isSupportedMainChain(requiredChainId) ? <RequiredChainIdModalContent /> : null}
      </StyledModal>
    </SideChainApiProvider>
  );
}

RequiredChainIdModal.propTypes = {
  requiredChainId: t.number,
};

function SwitchNetworkButton({ requiredChainId }) {
  const tokenBridgeApi = useSideChainApi();

  const switchChain = async () => {
    try {
      await tokenBridgeApi.destination.switchChain();
    } catch {
      // Do nothing...
    }
  };

  return (
    <Button onClick={switchChain}>
      <span>Switch to {chainIdToNetworkName[requiredChainId]}</span>
    </Button>
  );
}

SwitchNetworkButton.propTypes = {
  requiredChainId: t.number.isRequired,
};

function RequiredChainIdModalContent() {
  return <StyledExplainer>Please switch to the required network on MetaMask.</StyledExplainer>;
}

const StyledModal = styled(Modal)`
  .ant-modal-header {
    border: none;
  }

  .ant-modal-title {
    font-size: 36px;
    line-height: 1.33;
    text-align: center;
    color: #4d00b4;
  }

  .ant-modal-footer {
    border: none;
    text-align: center;
  }
`;

const StyledExplainer = styled(Typography.Paragraph)``;
