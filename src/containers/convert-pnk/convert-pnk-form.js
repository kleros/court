import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Alert, Button, Col, Form, Icon, InputNumber, Row, Typography } from "antd";
import { useDebouncedCallback } from "use-debounce";
import Web3 from "web3";
import { useSideChainApi } from "../../api/side-chain";
import BalanceTable from "../../components/balance-table";
import MultiTransactionStatus from "../../components/multi-transaction-status";
import TokenSymbol, { AutoDetectedTokenSymbol } from "../../components/token-symbol";
import { chainIdToNetworkShortName } from "../../helpers/networks";
import useAccount from "../../hooks/use-account";
import { useAsyncGenerator } from "../../hooks/use-generators";
import usePromise from "../../hooks/use-promise";

const { fromWei, toWei, toBN } = Web3.utils;

export default function ConvertPnkFormWrapper({ onDone }) {
  const sideChainApi = useSideChainApi();
  const account = useAccount();

  const tokenStats = usePromise(
    React.useCallback(() => sideChainApi.getTokenStats({ address: account }), [account, sideChainApi])
  );

  const hasAvailableTokens = toBN(tokenStats.value?.available ?? 0).gt(toBN(0));

  const { run, isRunning, isDone, transactions, error } = useWithdrawTokens(sideChainApi.withdraw);

  const handleFinish = React.useCallback(
    (values) => {
      const amountInWei = toWei(String(values.origin));
      run({
        address: account,
        amount: amountInWei,
      });
    },
    [run, account]
  );

  React.useEffect(() => {
    if (isDone) {
      onDone();
    }
  }, [isDone, onDone]);

  return (
    <>
      <PnkBalanceTable {...tokenStats?.value} error={tokenStats.error} />
      <StyledSpacer style={{ "--size": "3rem" }} />
      <ConvertPnkForm
        maxAvailable={hasAvailableTokens ? tokenStats.value.available : "0"}
        disabled={!hasAvailableTokens || isDone}
        isSubmitting={isRunning ?? false}
        onFinish={handleFinish}
      />
      {transactions.length > 0 ? (
        <>
          <StyledSpacer style={{ "--size": "1.5rem" }} />
          <MultiTransactionStatus transactions={transactions} chainId={sideChainApi.chainId} error={error} />
        </>
      ) : null}
    </>
  );
}

ConvertPnkFormWrapper.propTypes = {
  onDone: t.func,
};

ConvertPnkFormWrapper.defaultProps = {
  onDone: () => {},
};

function useWithdrawTokens(withdrawTokens) {
  const { run, ...withdrawResult } = useAsyncGenerator(withdrawTokens);

  const [withdraw] = withdrawResult?.value ?? [];

  const transactions = React.useMemo(
    () =>
      [
        {
          state: withdraw?.state,
          txHash: withdraw?.txHash,
          title: "Withdraw and Convert",
        },
      ].filter(({ state }) => !!state),
    [withdraw?.state, withdraw?.txHash]
  );

  return {
    run,
    transactions,
    ...withdrawResult,
    // isDone: true,
  };
}

function PnkBalanceTable({ balance, locked, pendingStake, staked, available, error }) {
  const tokenSymbol = <AutoDetectedTokenSymbol token="PNK" />;

  return (
    <>
      <BalanceTable title="Your Balance">
        <BalanceTable.Row description="Total:" value={balance} error={error} tokenSymbol={tokenSymbol} />
        <BalanceTable.Row
          description="Locked in cases:"
          value={locked}
          error={error}
          tokenSymbol={tokenSymbol}
          variant="warning"
        />
        <BalanceTable.Row
          description="Staked on courts:"
          value={staked}
          error={error}
          tokenSymbol={tokenSymbol}
          variant="warning"
        />
        {pendingStake ? (
          <BalanceTable.Row
            description="Pending stake*:"
            value={pendingStake}
            error={error}
            tokenSymbol={tokenSymbol}
            variant="warning"
          />
        ) : null}
        <BalanceTable.EmptyRow />
        <BalanceTable.Row
          description="Available to convert:"
          value={available}
          error={error}
          tokenSymbol={tokenSymbol}
          variant="primary"
        />
      </BalanceTable>
      {pendingStake ? (
        <>
          <StyledSpacer style={{ "--size": "1.5rem" }} />
          <Alert
            showIcon
            type="info"
            message="*Pending stake changes"
            description={
              <>
                <p>
                  When you stake or unstake on a Court, the Kleros main smart contract <strong>might</strong> not be
                  able to process the stake changes right away. If so, it usually takes a couple of minutes to a few
                  hours for your stake changes to be processed.
                </p>
                <p>
                  This means that if you have just unstaked, you will not be able to convert those {tokenSymbol} right
                  now. On the other hand, if you just staked, you can convert those {tokenSymbol} now, but the stake
                  changes will not be processed.
                </p>
              </>
            }
          />
        </>
      ) : null}
    </>
  );
}

PnkBalanceTable.propTypes = {
  balance: t.oneOfType([t.string, t.number, t.object]),
  locked: t.oneOfType([t.string, t.number, t.object]),
  pendingStake: t.oneOfType([t.string, t.number, t.object]),
  staked: t.oneOfType([t.string, t.number, t.object]),
  available: t.oneOfType([t.string, t.number, t.object]),
  error: t.instanceOf(Error),
};

const ConvertPnkForm = Form.create()(({ form, maxAvailable, isSubmitting, disabled, onFinish }) => {
  const sideChainApi = useSideChainApi();

  const { chainId, destinationChainId } = sideChainApi;

  const feeRatio = usePromise(React.useCallback(() => sideChainApi.getFeeRatio(), [sideChainApi]));

  const { validateFieldsAndScroll, getFieldDecorator, getFieldsError, setFieldsValue } = form;

  const maxAvailableNumeric = Math.trunc(Number(fromWei(maxAvailable ?? "0")));

  const originDecorator = getFieldDecorator("origin", {
    rules: [
      { required: true, message: "Amount is required." },
      async function validateBalance(_, value) {
        if (value > maxAvailableNumeric) {
          throw new Error("Not enough available tokens.");
        }
      },
    ],
  });

  const destinationDecorator = getFieldDecorator("destination", {
    rules: [{ required: true, message: "Amount is required." }],
  });

  const handleChangeOriginValue = useDebouncedCallback(
    React.useCallback(
      async (value) => {
        const valueInWei = toWei(String(value || 0));
        const newDestinationValue = String(await sideChainApi.getRelayedAmount({ originalAmount: valueInWei }));
        setFieldsValue({
          destination: Number(Number(fromWei(newDestinationValue)).toFixed(2)),
        });
      },
      [sideChainApi, setFieldsValue]
    ),
    500
  );

  const handleUseMaxClick = React.useCallback(() => {
    setFieldsValue({ origin: maxAvailableNumeric });
    handleChangeOriginValue(maxAvailableNumeric);
  }, [setFieldsValue, maxAvailableNumeric, handleChangeOriginValue]);

  const handleChangeDestinationValue = useDebouncedCallback(
    React.useCallback(
      async (value) => {
        const valueInWei = toWei(String(value || 0));
        const newOriginValue = String(await sideChainApi.getRequiredAmount({ desiredAmount: valueInWei }));
        setFieldsValue({
          origin: Number(Number(fromWei(newOriginValue)).toFixed(2)),
        });
      },
      [sideChainApi, setFieldsValue]
    ),
    [500]
  );

  const handleSubmit = React.useCallback(
    (evt) => {
      evt.preventDefault();
      validateFieldsAndScroll((err, values) => {
        if (err) {
          console.debug("Form validation error:", err);
          return;
        }

        onFinish(values);
      });
    },
    [validateFieldsAndScroll, onFinish]
  );

  return (
    <div>
      <StyledTitle level={3}>
        Convert <TokenSymbol chainId={chainId} token="PNK" />
      </StyledTitle>
      <Form hideRequiredMark layout="vertical" onSubmit={handleSubmit}>
        {feeRatio?.value ? (
          <>
            <StyledFeeNote
              css={`
                margin-top: -0.5rem;
              `}
            >
              There is a {formatPercent(feeRatio?.value)} fee charged by the Token Bridge operators when sending tokens
              back to {chainIdToNetworkShortName[destinationChainId]}.
            </StyledFeeNote>
            <StyledSpacer style={{ "--size": "0.5rem" }} />
          </>
        ) : null}
        <StyledRow>
          <StyledFieldCol>
            <StyledFormItem
              hasFeedback
              label={
                <StyledCompositeLabel>
                  <TokenSymbol chainId={chainId} token="PNK" />
                  <StyledButtonLink onClick={handleUseMaxClick}>use max.</StyledButtonLink>
                </StyledCompositeLabel>
              }
            >
              {originDecorator(
                <InputNumber
                  placeholder="Amount to send"
                  min={0}
                  max={maxAvailableNumeric}
                  size="large"
                  onChange={handleChangeOriginValue}
                />
              )}
            </StyledFormItem>
          </StyledFieldCol>
          <StyledSeparatorCol>
            <Icon type="right-circle" theme="filled" />
          </StyledSeparatorCol>
          <StyledFieldCol>
            <StyledFormItem hasFeedback label={<TokenSymbol chainId={destinationChainId} token="PNK" />}>
              {destinationDecorator(
                <InputNumber
                  placeholder="Amount to receive"
                  min={0}
                  size="large"
                  onChange={handleChangeDestinationValue}
                />
              )}
            </StyledFormItem>
          </StyledFieldCol>
        </StyledRow>
        <Button
          block
          type="primary"
          htmlType="submit"
          loading={isSubmitting}
          disabled={disabled || isSubmitting || hasErrors(getFieldsError())}
        >
          Convert
        </Button>
      </Form>
    </div>
  );
});

function formatPercent(value) {
  const nf = new Intl.NumberFormat([], { style: "percent", maximumFractionDigits: 2 });
  return nf.format(value);
}

function hasErrors(fieldsError) {
  return Object.keys(fieldsError).some((field) => fieldsError[field]);
}

const StyledTitle = styled(Typography.Title)`
  text-align: center;
`;

const StyledRow = styled(Row)`
  display: flex;
  gap: 12px;
  && {
    ::before,
    ::after {
      display: none;
    }
  }
  @media (max-width: 768px) {
    gap: 0;
    flex-wrap: wrap;
  }
`;

const StyledSeparatorCol = styled(Col)`
  flex: 24px 0 0;
  display: flex;
  justify-content: center;
  align-items: center;
  .anticon {
    width: 24px;
    height: 24px;
    transition: all 0.2s ease-in;
    > svg {
      width: 100%;
      height: 100%;
      fill: #009aff;
    }
  }
  @media (max-width: 768px) {
    flex-basis: 100%;
    margin-top: -12px;
    margin-bottom: -12px;
    .anticon {
      transform: rotate(90deg);
    }
  }
`;

const StyledFieldCol = styled(Col)`
  flex: 50% 1 1;
  @media (max-width: 768px) {
    flex-basis: 100%;
  }
`;

const StyledFormItem = styled(Form.Item)`
  && {
    .ant-input-number {
      width: 100%;
    }
  }
`;

const StyledButtonLink = styled.button.attrs((...rest) => ({ ...rest, type: "button" }))`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-weight: inherit;
  display: inline-block;
  color: #009aff;
`;

const StyledCompositeLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;

  ${StyledButtonLink} {
    margin-left: auto;
  }
`;

const StyledFeeNote = styled.p`
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  text-align: center;
`;

const StyledSpacer = styled.span`
  display: flex;
  clear: both;
  width: 100%;
  margin-bottom: var(--size, 1rem);
`;
