import React from "react";
import styled from "styled-components/macro";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { Divider } from "antd";
import { getCounterPartyChainId, isSupportedSideChain, SideChainApiProvider } from "../../api/side-chain";
import TokenSymbol from "../../components/token-symbol";
import TopBanner from "../../components/top-banner";
import { chainIdToNetworkName } from "../../helpers/networks";
import useChainId from "../../hooks/use-chain-id";
import C404 from "../404";
import ConvertPnkCard from "./convert-pnk-card";

const { useDrizzle } = drizzleReactHooks;

export default function ConvertPnkWrapper() {
  const chainId = useChainId();
  const { drizzle } = useDrizzle();

  if (!isSupportedSideChain(chainId)) {
    return <C404 />;
  }

  return (
    <SideChainApiProvider web3Provider={drizzle.web3.currentProvider}>
      <ConvertPnk />
    </SideChainApiProvider>
  );
}

function ConvertPnk() {
  const chainId = useChainId();
  const destinationChainId = getCounterPartyChainId(chainId);

  return (
    <>
      <TopBanner
        title="Convert stPNK"
        description={
          <>
            Send your <TokenSymbol chainId={chainId} token="PNK" /> to get{" "}
            <TokenSymbol chainId={destinationChainId} token="PNK" /> back on {chainIdToNetworkName[destinationChainId]}
          </>
        }
      />
      <StyledDivider />
      <ConvertPnkCard />
    </>
  );
}

const StyledDivider = styled(Divider)`
  border: none !important;
  background: none !important;
`;
