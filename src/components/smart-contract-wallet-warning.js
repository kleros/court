import React, { useEffect, useMemo, useState } from "react";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import { useDrizzle } from "../bootstrap/drizzle";
import { Alert } from "antd";
import { createPortal } from "react-dom";
import styled from "styled-components";
import createPersistedState from "use-persisted-state";
import PropTypes from "prop-types";

const { useDrizzleState } = drizzleReactHooks;
const EIP7702_PREFIX = "0xef0100";

const StyledAlert = styled(Alert)`
  text-align: center;

  .ant-alert-message {
    font-weight: bold;
  }
`;

const StyledP = styled.p`
  margin: 0;
`;

//Render a separate component for each connected account by giving it a `key={account}`.
//Otherwise, on wallet change, even though `createPersistedState` reads the correct dismissal flag, the showWarning state would not be updated without a forced refresh.
export default function SmartContractWalletWarning() {
  const { account = VIEW_ONLY_ADDRESS } = useDrizzleState((s) => ({ account: s.accounts[0] }));
  return <WalletWarningPerAccount key={account} account={account} />;
}

function WalletWarningPerAccount({ account }) {
  const { drizzle } = useDrizzle();
  const bannerRoot = typeof document !== "undefined" ? document.querySelector("#banner-root") : null;

  const useWalletWarning = useMemo(
    () => createPersistedState(`@kleros/court/alert/smart-contract-wallet-warning:${account?.toLowerCase()}`),
    [account]
  );
  const [showWarning, setShowWarning] = useWalletWarning(true);
  const [isSmartContractWallet, setIsSmartContractWallet] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchCode = async () => {
      try {
        const code = await drizzle.web3.eth.getCode(account);
        const formattedCode = (code || "").toLowerCase();
        const isEip7702 = formattedCode.startsWith(EIP7702_PREFIX);

        if (!cancelled) {
          //Do not show warning for EIP-7702 EOAs
          setIsSmartContractWallet(formattedCode !== "0x" && !isEip7702);
        }
      } catch (error) {
        console.error("Error fetching code for account", error);

        //If the component is still mounted
        if (!cancelled) {
          setIsSmartContractWallet(false);
        }
      }
    };

    if (account) {
      fetchCode();
    }

    return () => {
      cancelled = true;
    };
  }, [account, drizzle.web3]);

  if (!showWarning || !isSmartContractWallet || !bannerRoot) {
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

WalletWarningPerAccount.propTypes = {
  account: PropTypes.string.isRequired,
};
