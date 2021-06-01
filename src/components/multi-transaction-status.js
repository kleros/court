import React from "react";
import t from "prop-types";
import clsx from "clsx";
import styled from "styled-components/macro";
import { Icon, Steps } from "antd";
import { TxState } from "../helpers/transactions";
import { getTransactionUrl } from "../helpers/block-explorer";

export default function MultiTransactionStatus({ chainId, error, transactions }) {
  const currentPendingTx = transactions.findIndex((tx) => !isTxComplete(tx));
  const allComplete = transactions.every(isTxComplete);

  const currentStep = currentPendingTx !== -1 ? currentPendingTx : allComplete ? transactions.length : 0;
  const status = error ? "error" : allComplete ? "finish" : "process";

  return (
    <StyledSteps direction="vertical" size="small" current={currentStep} status={status}>
      {transactions.map((tx, index) => {
        return (
          <StyledStep
            className={clsx({ skipped: tx.state === "skipped" })}
            key={tx.txHash ?? index}
            title={tx.title}
            subTitle={
              tx.txHash || currentStep === index ? (
                <StyledSubTitle>
                  {tx.txHash ? (
                    <a href={getTransactionUrl(chainId, tx.txHash)} target="_blank" rel="noopener noreferrer">
                      View details
                    </a>
                  ) : null}
                  {currentStep === index && !error ? <Icon type="loading" /> : null}
                </StyledSubTitle>
              ) : null
            }
            description={
              error && currentStep === index ? (
                <StyledErrorDescription>
                  <span className="message">{error.message}</span>
                  {error.cause ? <span className="cause-message">({error.cause.message})</span> : null}
                </StyledErrorDescription>
              ) : null
            }
          />
        );
      })}
    </StyledSteps>
  );
}

MultiTransactionStatus.propTypes = {
  chainId: t.number.isRequired,
  error: t.instanceOf(Error),
  transactions: t.arrayOf(
    t.shape({
      state: t.oneOf([...Object.values(TxState), "skipped"]).isRequired,
      txHash: t.string,
      title: t.node.isRequired,
    })
  ).isRequired,
};

const isTxComplete = (tx) => tx.state === TxState.Mined || tx.state === "skipped";

const StyledSteps = styled(Steps)``;

const StyledStep = styled(Steps.Step)`
  &.skipped {
    opacity: 0.5;

    .ant-steps-item-title {
      text-decoration: line-through;
    }
  }
`;

const StyledSubTitle = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const StyledErrorDescription = styled.div`
  > span {
    display: block;
  }

  .cause-message {
    font-size: 12px;
  }
`;
