import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Button } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { requestSwitchChain } from "../../api/side-chain";
import { useSetRequiredChainId } from "../../components/required-chain-id-gateway";
import { chainIdToNetworkShortName } from "../../helpers/networks";

const { useDrizzle } = drizzleReactHooks;

export default function SwitchChainButton({ destinationChainId }) {
  const switchChain = useSwitchChain(destinationChainId);

  return (
    <StyledWrapper>
      <Button type="primary" onClick={switchChain}>
        Switch to {chainIdToNetworkShortName[destinationChainId]}
      </Button>
    </StyledWrapper>
  );
}

SwitchChainButton.propTypes = {
  destinationChainId: t.number.isRequired,
};

function useSwitchChain(destinationChainId) {
  const { drizzle } = useDrizzle();
  const setRequiredChainId = useSetRequiredChainId();

  return React.useCallback(async () => {
    try {
      await requestSwitchChain(drizzle.web3.currentProvider, destinationChainId);
    } catch (err) {
      // 4001 is the MetaMask error code when users deny permission.
      if (err.code !== 4001) {
        /**
         * If the call fails with any other reason, then set the global required chain ID.
         */
        console.warn("Failed to request the switch to the side-chain:", err);
        setRequiredChainId(destinationChainId);
      }
    }
  }, [destinationChainId, setRequiredChainId, drizzle.web3.currentProvider]);
}

const StyledWrapper = styled.div`
  display: flex;
  justify-content: center;
`;
