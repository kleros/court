import React from "react";
import styled from "styled-components/macro";
import { Divider } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { TokenBridgeApiProvider } from "../../api/token-bridge";
import TopBanner from "../../components/top-banner";
import RequiredChainIdGateway from "../../components/required-chain-id-gateway";
import TokenBridgeCard from "./token-bridge-card";

const { useDrizzle } = drizzleReactHooks;

export default function TokenBridge() {
  const { drizzle } = useDrizzle();

  return (
    <>
      <TopBanner description="Make cross-chain PNK transfers to your own account" title="PNK Token Bridge" />
      <StyledDivider />
      <TokenBridgeApiProvider web3Provider={drizzle.web3.currentProvider}>
        <RequiredChainIdGateway>
          <TokenBridgeCard />
        </RequiredChainIdGateway>
      </TokenBridgeApiProvider>
    </>
  );
}

const StyledDivider = styled(Divider)`
  border: none !important;
  background: none !important;
`;
