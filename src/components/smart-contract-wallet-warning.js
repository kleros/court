import React, { useState } from "react";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import { useDrizzle } from "../bootstrap/drizzle";
import { Alert } from "antd";
import { createPortal } from "react-dom";
import styled from "styled-components";

const { useDrizzleState } = drizzleReactHooks;
const bannerRoot = document.querySelector("#banner-root");

const StyledAlert = styled(Alert)`
  text-align: center;

  .ant-alert-message {
    font-weight: bold;
  }
`;

export default function SmartContractWalletWarning() {
  const { drizzle } = useDrizzle();
  const { account = VIEW_ONLY_ADDRESS } = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0],
  }));
  const [isSmartContractWallet, setIsSmartContractWallet] = useState(false);

  drizzle.web3.eth.getCode(account).then((code) => {
    setIsSmartContractWallet(code !== "0x");
  });

  if (!isSmartContractWallet) {
    return null;
  }

  return createPortal(
    <StyledAlert
      message="Warning"
      description="You are using a smart contract wallet. This is not recommended."
      type="warning"
      banner
      closable
    />,
    bannerRoot
  );
}
