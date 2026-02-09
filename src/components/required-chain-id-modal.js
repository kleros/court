import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { Button, Icon, Modal, Typography } from "antd";
import { chainIdToNetworkName } from "../helpers/networks";
import { isSupportedSideChain, requestSwitchChain } from "../api/side-chain";
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
      visible={hasAccount}
      centered
      width={640}
      footer={
        hasAccount && isSupportedSideChain(requiredChainId) ? (
          <SwitchNetworkButton requiredChainId={requiredChainId} />
        ) : null
      }
      title={`Switch to ${networkName}`}
      onCancel={() => cleanRequiredChainId()}
    >
      {hasAccount && (
        <>
          {isSupportedSideChain(requiredChainId) ? (
            <StyledExplainer>
              To go to the Kleros Side-Chain Court, please click the button bellow or switch to {networkName} on
              MetaMask.
            </StyledExplainer>
          ) : (
            <StyledExplainer>
              To go back to the main Kleros Court, please switch to {networkName} on MetaMask.
            </StyledExplainer>
          )}
        </>
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
        await requestSwitchChain(drizzle.web3.currentProvider, requiredChainId);
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
      <span>Go to Court on {chainIdToNetworkName[requiredChainId]}</span>
      <Icon type="arrow-right" />
    </Button>
  );
}

SwitchNetworkButton.propTypes = {
  requiredChainId: t.number.isRequired,
};

const StyledModal = styled(Modal)`
  max-width: calc(100vw - 32px);

  .ant-modal-header {
    border: none;
  }

  .ant-modal-title {
    font-size: 36px;
    line-height: 1.33;
    text-align: center;

    @media (max-width: 575px) {
      font-size: 24px;
    }
  }

  .ant-modal-footer {
    padding: 16px 24px;
    border: none;
    text-align: center;
  }
`;

const StyledExplainer = styled(Typography.Paragraph)`
  text-align: center;
  color: ${({ theme }) => theme.textSecondary};
`;
