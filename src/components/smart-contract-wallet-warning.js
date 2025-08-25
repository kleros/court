import React, { useEffect, useState } from "react";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import { useDrizzle } from "../bootstrap/drizzle";
import { Alert } from "antd";
import { createPortal } from "react-dom";
import styled from "styled-components";
import createPersistedState from "use-persisted-state";

const { useDrizzleState } = drizzleReactHooks;
const useSmartContractWalletWarning = createPersistedState("@kleros/court/alert/smart-contract-wallet-warning");
const bannerRoot = document.querySelector("#banner-root");

const StyledAlert = styled(Alert)`
  text-align: center;

  .ant-alert-message {
    font-weight: bold;
  }
`;

const StyledP = styled.p`
  margin: 0;
`;

export default function SmartContractWalletWarning() {
  const { drizzle } = useDrizzle();
  const { account = VIEW_ONLY_ADDRESS } = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0],
  }));
  const [showWarning, setShowWarning] = useSmartContractWalletWarning(true);
  const [isSmartContractWallet, setIsSmartContractWallet] = useState(false);

  useEffect(() => {
    drizzle.web3.eth.getCode(account).then((code) => {
      setIsSmartContractWallet(code !== "0x");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, drizzle]);

  if (!showWarning || !isSmartContractWallet) {
    return null;
  }

  return createPortal(
    <StyledAlert
      message="Warning"
      description={
        <StyledP>
          You are using a smart contract wallet. This is not recommended.{" "}
          <a
            href="https://docs.kleros.io/kleros-faq#can-i-use-a-smart-contract-account-to-stake-in-the-court"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more.
          </a>
        </StyledP>
      }
      type="warning"
      banner
      closable
      onClose={() => setShowWarning(false)}
    />,
    bannerRoot
  );
}
