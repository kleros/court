import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Link } from "react-router-dom";
import { Affix, Button, Divider, Modal, Typography } from "antd";
import Web3 from "web3";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import {
  isSupportedSideChain,
  requestWatchToken,
  SideChainApiProvider,
  Tokens,
  useSideChainApi,
} from "../../api/side-chain";
import useChainId from "../../hooks/use-chain-id";
import useAccount from "../../hooks/use-account";
import usePromise from "../../hooks/use-promise";
import useForceUpdate from "../../hooks/use-force-update";
import { useAsyncGenerator } from "../../hooks/use-generators";
import { getTokenSymbol } from "../token-symbol";
import MultiBalance from "../multi-balance";
import MultiTransactionStatus from "../multi-transaction-status";

const { useDrizzle } = drizzleReactHooks;

const { toBN } = Web3.utils;

export default function SideChainPnkActionsWrapper(props) {
  const chainId = useChainId();
  const isSupported = isSupportedSideChain(chainId);

  const { drizzle } = useDrizzle();

  return isSupported ? (
    <SideChainApiProvider web3Provider={drizzle.web3.currentProvider}>
      <SideChainPnkActions {...props} />
    </SideChainApiProvider>
  ) : null;
}

function SideChainPnkActions({ showUnwrappedPnkModal, unwrappedPnkModalProps, showGetSideChainPnkModal }) {
  const account = useAccount();
  const { getRawBalance, getBalance } = useSideChainApi();
  const [tokenData, refetch] = useTokenData({ getRawBalance, getBalance, account });
  const { balance, rawBalance, errors, hasErrors } = tokenData;

  const { drizzle } = useDrizzle();
  const [hasBalance, hasRawBalance] = [tokenData.balance, tokenData.rawBalance].map((value) =>
    value ? toBN(value).gt(toBN("0")) : false
  );

  React.useEffect(() => {
    if (hasBalance) {
      requestWatchToken(drizzle.web3.currentProvider, Tokens.stPNK);
    }
  }, [drizzle.web3.currentProvider, hasBalance]);

  React.useEffect(() => {
    if (hasRawBalance) {
      requestWatchToken(drizzle.web3.currentProvider, Tokens.PNK);
    }
  }, [drizzle.web3.currentProvider, hasRawBalance]);

  if (hasErrors) {
    return <ErrorModal balance={balance} rawBalance={rawBalance} errors={errors} />;
  }

  if (showUnwrappedPnkModal && rawBalance?.gt(toBN("0"))) {
    return <UnwrappedSideChainPnkModal {...unwrappedPnkModalProps} {...tokenData} account={account} onDone={refetch} />;
  }

  if (showGetSideChainPnkModal && rawBalance?.isZero() && balance?.isZero()) {
    return <GetSideChainPnkModal />;
  }

  return null;
}

SideChainPnkActions.propTypes = {
  showUnwrappedPnkModal: t.bool,
  unwrappedPnkModalProps: t.shape({
    triggerCondition: t.oneOf(["click", "auto", "both"]),
  }),
  showGetSideChainPnkModal: t.bool,
};

SideChainPnkActions.defaultProps = {
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

function UnwrappedSideChainPnkModal({ triggerCondition, account, balance, rawBalance, errors, onDone }) {
  const chainId = useChainId();

  const { deposit } = useSideChainApi();
  const { run, isRunning, isDone, transactions, error } = useDepositTokens(deposit);

  const showTriggerButton = ["click", "both"].includes(triggerCondition);
  const showAutomatically = ["auto", "both"].includes(triggerCondition);

  const xPNKtokenSymbol = getTokenSymbol(chainId, "xPNK");
  const PNKTokenSymbol = getTokenSymbol(chainId, "PNK");

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
      onDone();
    }
  }, [isDone, onDone]);

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
            <span>Deposit {xPNKtokenSymbol}</span>
          </StyledPulseButton>
        </Affix>
      ) : null}
      <StyledModal
        visible={visible}
        centered
        width={586}
        title={<>Deposit your {xPNKtokenSymbol}</>}
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
          To be able to stake on Kleros Court, you need to deposit your {xPNKtokenSymbol} to convert it to{" "}
          {PNKTokenSymbol}(Staking PNK).{" "}
          <strong>
            You will receive 1 {PNKTokenSymbol} for every 1 {xPNKtokenSymbol} you deposit.
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
  onDone: t.func,
};

UnwrappedSideChainPnkModal.defaultProps = {
  triggerCondition: "both",
  onDone: () => {},
};

function GetSideChainPnkModal({ defaultVisible }) {
  const chainId = useChainId();
  const xPNKtokenSymbol = getTokenSymbol(chainId, "xPNK");

  const [visible, setVisible] = React.useState(defaultVisible);
  const handleCancel = () => setVisible(false);

  return (
    <StyledModal
      visible={visible}
      centered
      width={586}
      title={<>You have no {xPNKtokenSymbol}</>}
      onCancel={handleCancel}
      footer={null}
    >
      <StyledExplainer>
        To be able to stake on Kleros Court, first you need to get some {xPNKtokenSymbol}.
      </StyledExplainer>
      <div
        css={`
          text-align: center;
        `}
      >
        <Link
          to="/tokens"
          style={{
            display: "inline-block",
          }}
        >
          <StyledButton size="large" type="secondary">
            Buy PNK
          </StyledButton>
        </Link>
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
  const [token, forceUpdate] = useForceUpdate();
  const rawBalance = usePromise(
    React.useCallback(
      () => getRawBalance({ address: account }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [getRawBalance, account, token]
    )
  );
  const balance = usePromise(
    React.useCallback(
      () => getBalance({ address: account }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [getBalance, account, token]
    )
  );

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

  const tokenData = React.useMemo(
    () => ({
      balance: balance.value,
      rawBalance: rawBalance.value,
      ...errorInfo,
    }),
    [balance.value, rawBalance.value, errorInfo]
  );

  return [tokenData, forceUpdate];
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

const StyledButton = styled(Button)`
  box-shadow: none;
  text-shadow: none;
`;
