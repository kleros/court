import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { Button, Icon, Modal, Typography } from "antd";
import { chainIdToNetworkName } from "../helpers/networks";
import { isSupportedSideChain, requestSwitchToSideChain } from "../api/side-chain";
import { useClearRequiredChainId, useSetRequiredChainId } from "./required-chain-id-gateway";
import useAccount from "../hooks/use-account";

const { useDrizzle } = drizzleReactHooks;

export default function RequiredChainIdModal({ requiredChainId }) {
  const account = useAccount();
  const hasAccount = !!account;

  const networkName = chainIdToNetworkName[requiredChainId];
  const cleanRequiredChainId = useClearRequiredChainId();

  return (
    <StyledModal
      visible
      centered
      width={640}
      footer={
        hasAccount && isSupportedSideChain(requiredChainId) ? (
          <SwitchNetworkButton requiredChainId={requiredChainId} />
        ) : null
      }
      title="Wrong Network"
      onCancel={() => cleanRequiredChainId()}
    >
      {hasAccount ? (
        isSupportedSideChain(requiredChainId) ? (
          <StyledExplainer>Please click the button bellow or switch to {networkName} on MetaMask.</StyledExplainer>
        ) : (
          <StyledExplainer>Please switch to {networkName} on MetaMask.</StyledExplainer>
        )
      ) : (
        <StyledExplainer>
          You need an{" "}
          <a href="https://ethereum.org/en/wallets/" target="_blank" rel="noreferrer noopener">
            Ethereum Wallet
          </a>{" "}
          to be able to switch to {networkName}.
        </StyledExplainer>
      )}
    </StyledModal>
  );
}

RequiredChainIdModal.propTypes = {
  requiredChainId: t.number,
};

function SwitchNetworkButton({ requiredChainId }) {
  const { drizzle } = useDrizzle();

  const setRequiredChainId = useSetRequiredChainId();

  const switchChain = async () => {
    if (isSupportedSideChain(requiredChainId)) {
      try {
        await requestSwitchToSideChain(drizzle.web3.currentProvider);
      } catch (err) {
        console.warn("Failed to request the switch to the side-chain:", err);
        /**
         * If the call fails, it means that it's not supported.
         * This happens for the native Ethereum Mainnet and well-known testnets,
         * such as Ropsten and Kovan. Apparently this is due to security reasons.
         * @see { @link https://docs.metamask.io/guide/rpc-api.html#wallet-addethereumchain }
         */
        setRequiredChainId(requiredChainId);
      }
    } else if (requiredChainId) {
      setRequiredChainId(requiredChainId);
    }
  };

  return (
    <Button onClick={switchChain}>
      <span>Switch to {chainIdToNetworkName[requiredChainId]}</span>
      <Icon type="arrow-right" />
    </Button>
  );
}

SwitchNetworkButton.propTypes = {
  requiredChainId: t.number.isRequired,
};

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

const StyledExplainer = styled(Typography.Paragraph)`
  text-align: center;
`;
