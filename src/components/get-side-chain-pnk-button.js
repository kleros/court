import React from "react";
import styled from "styled-components/macro";
import { Link } from "react-router-dom";
import { Button } from "../adapters/antd";
import { counterPartyChainIdMap, isSupportedSideChain, useTokenBridgeApi } from "../api/token-bridge";
import TokenSymbol from "./token-symbol";

export default function GetSideChainPnkButton() {
  const tokenBridgeApi = useTokenBridgeApi();
  const isSupported = isSupportedSideChain(tokenBridgeApi.origin.chainId);
  const counterPartyChainId = counterPartyChainIdMap[tokenBridgeApi.origin.chainId];

  return isSupported ? (
    <Link
      component={StyledButton}
      to={`/token-bridge?requiredChainId=${counterPartyChainId}`}
      size="large"
      type="secondary"
    >
      <span>
        Get <TokenSymbol chainId={tokenBridgeApi.origin.chainId} token="PNK" />
      </span>
    </Link>
  ) : null;
}

const StyledButton = styled(Button)`
  box-shadow: none;
  text-shadow: none;
`;
