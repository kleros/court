import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Spin } from "antd";
import useChainId from "../hooks/use-chain-id";

//A wallet chain change always reloads the page (ChainChangeWatcher). Until the new page loads, the URL and the data still
//belong to the old chain, so pages would flash the switch prompt or render the new chain on stale data. Every page shows
//a spinner instead.
export default function SwitchingNetwork({ children }) {
  const isReloadPending = useIsReloadPending(useChainId());
  return isReloadPending ? <StyledSpin tip="Switching network…" /> : children;
}

SwitchingNetwork.propTypes = {
  children: t.node.isRequired,
};

//The first known chain is the baseline, so discovering the chain after mount is not a switch.
function useIsReloadPending(chainId) {
  const initialChainId = React.useRef();
  if (initialChainId.current === undefined && chainId !== undefined) {
    initialChainId.current = chainId;
  }
  return initialChainId.current !== undefined && chainId !== initialChainId.current;
}

//Centred on the page, like the app's other loading spinners (StyledSpin in bootstrap/app.js).
const StyledSpin = styled(Spin)`
  left: 50%;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);

  .ant-spin-dot-item {
    background-color: ${({ theme }) => theme.primaryPurple};
  }
`;
