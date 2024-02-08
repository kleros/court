import React, { useMemo } from "react";
import styled from "styled-components/macro";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { Divider, Spin } from "antd";
import { getCounterPartyChainId, isSupportedMainChain, SideChainApiProvider } from "../../api/side-chain";
import { getReadOnlyWeb3 } from "../../bootstrap/web3";
import { getTokenSymbol } from "../../helpers/get-token-symbol";
import TopBanner from "../../components/top-banner";
import { chainIdToNetworkName } from "../../helpers/networks";
import useChainId from "../../hooks/use-chain-id";
import C404 from "../404";
import ConvertPnkCard from "./convert-pnk-card";
import WithdrawStPnk from "./wihdraw-stpnk-card";

const { useDrizzle } = drizzleReactHooks;

export default function ConvertPnkWrapper() {
  const chainId = useChainId();
  const { drizzle } = useDrizzle();

  const web3Provider = React.useMemo(() => {
    try {
      return isSupportedMainChain(chainId)
        ? getReadOnlyWeb3({ chainId: getCounterPartyChainId(chainId) })
        : drizzle.web3.currentProvider;
    } catch (err) {
      console.warn("Failed to get a provider for the side-chain API:", err);
      return null;
    }
  }, [drizzle.web3.currentProvider, chainId]);

  return web3Provider ? (
    <SideChainApiProvider
      web3Provider={web3Provider}
      renderOnLoading={() => (
        <Spin
          spinning
          tip="Initializing side-chain API..."
          css={`
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          `}
        />
      )}
    >
      <ConvertPnk />
    </SideChainApiProvider>
  ) : (
    <C404 />
  );
}

function ConvertPnk() {
  const currentChainId = useChainId();
  const counterPartyChainId = getCounterPartyChainId(currentChainId);

  const originChainId = isSupportedMainChain(counterPartyChainId) ? currentChainId : counterPartyChainId;
  const targetChainId = isSupportedMainChain(counterPartyChainId) ? counterPartyChainId : currentChainId;

  const originChainTokenSymbol = useMemo(() => getTokenSymbol(originChainId, "PNK"), [originChainId]);
  const targetChainTokenSymbol = useMemo(() => getTokenSymbol(targetChainId, "PNK"), [targetChainId]);

  return (
    <>
      <TopBanner
        title="Convert to PNK"
        description={
          <>
            Send your {originChainTokenSymbol} to get {targetChainTokenSymbol} back on{" "}
            {chainIdToNetworkName[targetChainId]}
          </>
        }
      />
      <StyledDivider />
      <ConvertPnkCard />
      <StyledDivider />
      <WithdrawStPnk />
    </>
  );
}

const StyledDivider = styled(Divider)`
  border: none !important;
  background: none !important;
`;
