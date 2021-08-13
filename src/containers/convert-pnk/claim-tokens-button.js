import React from "react";
import styled from "styled-components/macro";
import { Button } from "antd";
import { getSideChainParamsFromMainChainId } from "../../api/side-chain";
import useChainId from "../../hooks/use-chain-id";

export default function ClaimTokensButton() {
  const chainId = useChainId();

  const url = React.useMemo(() => {
    try {
      return getSideChainParamsFromMainChainId(chainId).bridgeAppHistoryUrl;
    } catch (err) {
      return null;
    }
  }, [chainId]);

  return (
    <StyledWrapper>
      <Button type="primary" href={url} target="_blank" rel="noreferrer noopener">
        Claim your tokens
      </Button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  display: flex;
  justify-content: center;
`;
