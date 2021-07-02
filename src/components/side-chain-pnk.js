import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Affix, Button, Divider, Modal, Typography } from "antd";
import Web3 from "web3";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { isSupportedSideChain, SideChainApiProvider, useSideChainApi } from "../api/side-chain";
import useChainId from "../hooks/use-chain-id";
import useAccount from "../hooks/use-account";
import usePromise from "../hooks/use-promise";
import { useAsyncGenerator } from "../hooks/use-generators";
import TokenSymbol from "./token-symbol";
import MultiBalance from "./multi-balance";
import MultiTransactionStatus from "./multi-transaction-status";
import GetSideChainPnkButton from "./get-side-chain-pnk-button";

const { useDrizzle } = drizzleReactHooks;

const { toBN } = Web3.utils;

export default function SideChainPnkWrapper(props) {
  const chainId = useChainId();
  const isSupported = isSupportedSideChain(chainId);

  const { drizzle } = useDrizzle();

  return isSupported ? (
    <SideChainApiProvider web3Provider={drizzle.web3.currentProvider}>
      <SideChainPnk {...props} />
    </SideChainApiProvider>
  ) : null;
}

function SideChainPnk({ showUnwrappedPnkModal, unwrappedPnkModalProps, showGetSideChainPnkModal }) {
  const account = useAccount();
  const { getRawBalance, getBalance } = useSideChainApi();
  const tokenData = useTokenData({ getRawBalance, getBalance, account });
  const { balance, rawBalance, errors, hasErrors } = tokenData;

  if (hasErrors) {
    return <ErrorModal balance={balance} rawBalance={rawBalance} errors={errors} />;
  }

  if (showUnwrappedPnkModal && rawBalance?.gt(toBN("0"))) {
    return <UnwrappedSideChainPnkModal {...unwrappedPnkModalProps} {...tokenData} account={account} />;
  }

  if (showGetSideChainPnkModal && rawBalance?.isZero() && balance?.isZero()) {
    return <GetSideChainPnkModal />;
  }

  return null;
}

SideChainPnk.propTypes = {
  showUnwrappedPnkModal: t.bool,
  unwrappedPnkModalProps: t.shape({
    triggerCondition: t.oneOf(["click", "auto", "both"]),
  }),
  showGetSideChainPnkModal: t.bool,
};

SideChainPnk.defaultProps = {
  showUnwrappedPnkModal: true,
  showGetSideChainPnkModal: true,
};

function ErrorModal({ balance, rawBalance, errors }) {
  const chainId = useChainId();

  return chainId ? (
    <StyledModal visible centered width={586} title="Something went wrong!" footer={null}>
      <MultiBalance chainId={chainId} errors={errors} balance={balance} rawBalance={rawBalance} />
    </StyledModal>
  ) : null;
}

ErrorModal.propTypes = {
  balance: t.oneOfType([t.string, t.any.isRequired]),
  rawBalance: t.oneOfType([t.string, t.any.isRequired]),
  errors: t.shape({
    balance: t.instanceOf(Error),
    rawBalance: t.instanceOf(Error),
  }),
};

function UnwrappedSideChainPnkModal({ triggerCondition, account, balance, rawBalance, errors }) {
  const chainId = useChainId();

  const { deposit } = useSideChainApi();
  const { run, isRunning, isDone, transactions, error } = useDepositTokens(deposit);

  const showTriggerButton = ["click", "both"].includes(triggerCondition);
  const showAutomatically = ["auto", "both"].includes(triggerCondition);

  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    setVisible(showAutomatically);
  }, [showAutomatically]);

  const okButtonDisabled = rawBalance === undefined || isRunning;
  const handleOk = () => {
    if (!okButtonDisabled) {
      run({
        address: account,
        amount: rawBalance,
      });
    }
  };
  React.useEffect(() => {
    if (isDone) {
      setVisible(false);
    }
  }, [isDone]);

  const cancelButtonDisabled = isRunning;
  const handleCancel = () => {
    if (!cancelButtonDisabled) {
      setVisible(false);
    }
  };

  return (
    <>
      {showTriggerButton ? (
        <Affix style={{ position: "fixed", bottom: 24, left: 24 }}>
          <StyledPulseButton type="primary" shape="round" size="large" onClick={() => setVisible(true)}>
            <span>
              Deposit <TokenSymbol chainId={chainId} token="xPNK" />
            </span>
          </StyledPulseButton>
        </Affix>
      ) : null}
      <StyledModal
        visible={visible}
        centered
        width={586}
        title={
          <>
            Deposit your <TokenSymbol chainId={chainId} token="xPNK" />
          </>
        }
        cancelText="Ignore"
        onCancel={handleCancel}
        cancelButtonProps={{
          disabled: okButtonDisabled,
        }}
        okText="Deposit"
        okButtonProps={{
          disabled: cancelButtonDisabled,
          icon: isRunning ? "loading" : "",
        }}
        onOk={handleOk}
      >
        <StyledExplainer>
          To be able to stake on Kleros Court, you need to deposit your <TokenSymbol chainId={chainId} token="xPNK" />{" "}
          to convert it to <TokenSymbol chainId={chainId} token="PNK" /> (Staking PNK).{" "}
          <strong>
            You will receive 1 <TokenSymbol chainId={chainId} token="PNK" /> for every 1{" "}
            <TokenSymbol chainId={chainId} token="xPNK" /> you deposit.
          </strong>
        </StyledExplainer>
        <MultiBalance errors={errors} balance={balance} rawBalance={rawBalance} />
        {transactions.length > 0 ? (
          <>
            <StyledDivider $size={0.5} />
            <MultiTransactionStatus transactions={transactions} chainId={chainId} error={error} />
          </>
        ) : null}
      </StyledModal>
    </>
  );
}

UnwrappedSideChainPnkModal.propTypes = {
  account: t.string.isRequired,
  balance: t.oneOfType([t.string, t.any.isRequired]),
  rawBalance: t.oneOfType([t.string, t.any.isRequired]),
  errors: t.shape({
    balance: t.instanceOf(Error),
    rawBalance: t.instanceOf(Error),
  }),
  triggerCondition: t.oneOf(["click", "auto", "both"]),
};

UnwrappedSideChainPnkModal.defaultProps = {
  triggerCondition: "both",
};

function GetSideChainPnkModal({ defaultVisible }) {
  const chainId = useChainId();

  const [visible, setVisible] = React.useState(defaultVisible);
  const handleCancel = () => setVisible(false);

  return (
    <StyledModal
      visible={visible}
      centered
      width={586}
      title={
        <>
          You have no <TokenSymbol chainId={chainId} token="xPNK" />
        </>
      }
      onCancel={handleCancel}
      footer={null}
    >
      <StyledExplainer>
        To be able to stake on Kleros Court, first you need to get some <TokenSymbol chainId={chainId} token="xPNK" />.
      </StyledExplainer>
      <div
        css={`
          text-align: center;
        `}
      >
        <GetSideChainPnkButton block type="link" size={null} icon="arrow-right" />
      </div>
    </StyledModal>
  );
}

GetSideChainPnkModal.propTypes = {
  defaultVisible: t.bool,
};

GetSideChainPnkModal.defaultProps = {
  defaultVisible: true,
};

function useTokenData({ getRawBalance, getBalance, account }) {
  const rawBalance = usePromise(React.useMemo(() => getRawBalance({ address: account }), [getRawBalance, account]));
  const balance = usePromise(React.useMemo(() => getBalance({ address: account }), [getBalance, account]));

  const errorInfo = React.useMemo(
    () => ({
      errors: {
        balance: balance.error,
        rawBalance: rawBalance.error,
      },
      hasError: Boolean(balance.error || rawBalance.error),
    }),
    [balance.error, rawBalance.error]
  );

  return React.useMemo(
    () => ({
      balance: balance.value,
      rawBalance: rawBalance.value,
      ...errorInfo,
    }),
    [balance.value, rawBalance.value, errorInfo]
  );
}

function useDepositTokens(depositTokens) {
  const { run, ...depositTokensResult } = useAsyncGenerator(depositTokens);

  const [approve, deposit] = depositTokensResult?.value ?? [];

  const transactions = React.useMemo(
    () =>
      [
        {
          state: approve?.state,
          txHash: approve?.txHash,
          title: "Approve",
        },
        {
          state: deposit?.state,
          txHash: deposit?.txHash,
          title: "Deposit Tokens",
        },
      ].filter(({ state }) => !!state),
    [approve?.state, approve?.txHash, deposit?.state, deposit?.txHash]
  );

  return {
    run,
    transactions,
    ...depositTokensResult,
  };
}

const StyledModal = styled(Modal)`
  .ant-modal-header {
    border: none;
  }

  .ant-modal-title {
    font-size: 36px;
    line-height: 1.33;
    text-align: center;
    color: #4d00b4;
  }

  .ant-modal-footer {
    border: none;
    padding: 10px 24px;

    > div {
      display: flex;
      gap: 16px;

      > button {
        min-width: 72px;
      }

      > button:last-of-type {
        margin-left: auto;
      }
    }
  }
`;

const StyledExplainer = styled(Typography.Paragraph)``;

const StyledDivider = styled(Divider).attrs((p) => ({
  ...p,
  type: p.type ?? "horizontal",
  $size: p.$size ?? 1,
}))`
  border: none !important;
  background: none !important;
  margin: ${(p) => (p.type === "horizontal" ? `${24 * p.$size}px 0` : `0 ${24 * p.$size}px`)};
`;

const StyledPulseButton = styled(Button)`
  background-color: #00c42b;
  border-color: #00c42b;
  box-shadow: 0 0 0 rgba(26, 255, 76, 0.4), 2px 2px 8px rgba(0, 0, 0, 0.5);
  animation: pulse 2s infinite;

  :hover,
  :focus {
    background-color: #00e632;
    border-color: #00e632;
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(26, 255, 76, 0.4), 2px 2px 8px rgba(0, 0, 0, 0.5);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(26, 255, 76, 0), 2px 2px 8px rgba(0, 0, 0, 0.5);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(26, 255, 76, 0), 2px 2px 8px rgba(0, 0, 0, 0.5);
    }
  }
`;
