import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Icon } from "antd";
import { ButtonLink } from "../adapters/antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { requestSwitchToSideChain, getCounterPartyChainId, isSupportedSideChain } from "../api/side-chain";
import useChainId from "../hooks/use-chain-id";
import { useSetRequiredChainId } from "../components/required-chain-id-gateway";
import { chainIdToNetworkName } from "../helpers/networks";

const { useDrizzle } = drizzleReactHooks;

export default function AlternativeChainCourt() {
  const { drizzle } = useDrizzle();
  const chainId = useChainId(drizzle.web3);

  const setRequiredChainId = useSetRequiredChainId();

  const destinationChainId = React.useMemo(() => {
    try {
      return getCounterPartyChainId(chainId);
    } catch {
      return undefined;
    }
  }, [chainId]);

  const switchNetwork = React.useCallback(async () => {
    if (isSupportedSideChain(destinationChainId)) {
      try {
        await requestSwitchToSideChain(drizzle.web3.currentProvider);
      } catch (err) {
        console.debug("Failed to request the switch to the side-chain:", err);
        /**
         * If the call fails, it means that it's not supported.
         * This happens for the native Ethereum Mainnet and well-known testnets,
         * such as Ropsten and Kovan. Apparently this is due to security reasons.
         * @see { @link https://docs.metamask.io/guide/rpc-api.html#wallet-addethereumchain }
         */
        setRequiredChainId(destinationChainId);
      }
    } else if (destinationChainId) {
      setRequiredChainId(destinationChainId);
    }
  }, [destinationChainId, setRequiredChainId, drizzle.web3.currentProvider]);

  return destinationChainId ? (
    <AlternativeChainCourtLink destinationChainId={destinationChainId} switchNetwork={switchNetwork} />
  ) : null;
}

function AlternativeChainCourtLink({ destinationChainId, switchNetwork }) {
  return (
    <StyledWrapper>
      <ButtonLink onClick={switchNetwork}>
        <span>Court on {chainIdToNetworkName[destinationChainId]}</span>
        <Icon type="arrow-right" />
      </ButtonLink>
    </StyledWrapper>
  );
}

AlternativeChainCourtLink.propTypes = {
  destinationChainId: t.number.isRequired,
  switchNetwork: t.func.isRequired,
};

const StyledWrapper = styled.div`
  margin: 24px 0 -56px;
  display: flex;
  justify-content: flex-end;
  position: relative;
  z-index: 200;

  & + .ant-spin-nested-loading {
    margin-top: 56px;
  }
`;
