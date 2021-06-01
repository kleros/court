import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import TokenSymbol from "../../../components/token-symbol";
import { chainIdToNetworkName } from "../../../helpers/networks";

const propTypes = {
  ethereumChainId: t.number.isRequired,
  xDaiChainId: t.number.isRequired,
};

export function ExplainerXDai({ ethereumChainId, xDaiChainId }) {
  return (
    <StyledExplainerText>
      In order to use Kleros Court on {chainIdToNetworkName[xDaiChainId]}, you need to convert your{" "}
      <TokenSymbol chainId={ethereumChainId} token="PNK" /> into <TokenSymbol chainId={xDaiChainId} token="PNK" /> (the
      wrapped PNK used for staking on {chainIdToNetworkName[xDaiChainId]} courts). Check the steps required to use the
      Court on {chainIdToNetworkName[xDaiChainId]} below:
    </StyledExplainerText>
  );
}

ExplainerXDai.propTypes = propTypes;

export function ExplainerEthereum({ ethereumChainId, xDaiChainId }) {
  return (
    <StyledExplainerText>
      To convert <TokenSymbol chainId={xDaiChainId} token="PNK" /> back to{" "}
      <TokenSymbol chainId={ethereumChainId} token="PNK" /> there is a fee charged by the Token Bridge of 0.5% of the
      transfered amount. Kleros does not profit from this.
    </StyledExplainerText>
  );
}

ExplainerEthereum.propTypes = propTypes;

const StyledExplainerText = styled.p`
  color: rgba(0, 0, 0, 0.45);
  font-size: 14px;
  text-align: center;
`;
