import React from "react";
import t from "prop-types";
import clsx from "clsx";
import { Typography } from "antd";
import Web3 from "web3";
import styled from "styled-components/macro";
import { chainIdToNetworkName } from "../helpers/networks";
import EthAmount from "./eth-amount";
import TokenSymbol from "./token-symbol";

const { toBN, BN } = Web3.utils;

export default function MultiChainBalance({
  errors,
  originChainId,
  originBalance,
  originTotalStaked,
  destinationChainId,
  destinationBalance,
}) {
  const available = originBalance && originTotalStaked ? toBN(originBalance).sub(toBN(originTotalStaked)) : null;

  const originTokenSymbol = <TokenSymbol chainId={originChainId} token="PNK" />;
  const destinationTokenSymbol = <TokenSymbol chainId={destinationChainId} token="PNK" />;

  return (
    <StyledMultiChainBalance>
      <StyledTitle level={3}>Your Balance</StyledTitle>
      <StyledContent>
        <table>
          <thead>
            <tr>
              <th colSpan={3}>{chainIdToNetworkName[originChainId]}</th>
            </tr>
          </thead>
          <tbody>
            <EntryRow
              error={errors.origin.available}
              description="Available:"
              value={available}
              tokenSymbol={originTokenSymbol}
              className="origin highlight"
            />
            <EntryRow
              error={errors.origin.staked}
              description="Staked:"
              value={originTotalStaked}
              tokenSymbol={originTokenSymbol}
              className="origin muted level-2"
            />
            <EntryRow
              error={errors.origin.balance}
              description="Total:"
              value={originBalance}
              tokenSymbol={originTokenSymbol}
              className="origin muted level-2"
            ></EntryRow>
          </tbody>
        </table>
        <StyledSpacer />
        <table>
          <thead>
            <tr>
              <th colSpan={3}>{chainIdToNetworkName[destinationChainId]}</th>
            </tr>
          </thead>
          <tbody>
            <EntryRow
              error={errors.destination.balance}
              description="Total:"
              value={destinationBalance}
              tokenSymbol={destinationTokenSymbol}
              className="destination highlight"
            />
          </tbody>
        </table>
      </StyledContent>
    </StyledMultiChainBalance>
  );
}

MultiChainBalance.propTypes = {
  errors: t.shape({
    origin: t.object,
    destination: t.object,
  }),
  originChainId: t.number.isRequired,
  originBalance: t.oneOfType([t.string, t.number, t.instanceOf(BN), t.object]),
  originTotalStaked: t.oneOfType([t.string, t.number, t.instanceOf(BN), t.object]),
  destinationChainId: t.number.isRequired,
  destinationBalance: t.oneOfType([t.string, t.number, t.instanceOf(BN), t.object]),
};

function EntryRow({ error, value, description, tokenSymbol, className }) {
  return (
    <tr className={clsx(className, { error: Boolean(error) })}>
      <th>{description}</th>
      {error ? (
        <td className="error" colSpan="2">
          {error.message}
        </td>
      ) : (
        <>
          <td className="amount">
            <EthAmount amount={value} tokenSymbol={false} />
          </td>
          <td className="token">{tokenSymbol}</td>
        </>
      )}
    </tr>
  );
}

EntryRow.propTypes = {
  error: t.instanceOf(Error),
  value: t.oneOfType([t.string, t.number, t.instanceOf(BN), t.object]),
  description: t.node.isRequired,
  tokenSymbol: t.node.isRequired,
  className: t.string,
};

const StyledMultiChainBalance = styled.section``;

const StyledTitle = styled(Typography.Title)`
  text-align: center;
`;

const StyledContent = styled.main`
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0px 2px 3px rgba(0, 0, 0, 0.06);
  border-radius: 18px;
  padding: 24px 30px;
  color: rgba(0, 0, 0, 0.85);

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead {
    th {
      color: rgba(0, 0, 0, 0.45);
      text-align: center;
    }
  }

  tbody {
    th,
    td {
      padding: 0 4px;
    }

    tr > :first-child {
      padding-left: 0;
    }

    tr > :last-child {
      padding-right: 0;
    }

    th {
      font-weight: normal;
    }

    td {
      font-weight: bold;
    }

    td.amount {
      width: 100%;
      text-align: right;
    }

    td.error {
      color: #f60c36;
    }

    th,
    td.token {
      white-space: nowrap;
    }

    tr.muted {
      color: rgba(0, 0, 0, 0.45);
    }

    tr.spacer > td {
      text-indent: -9999px;
    }

    tr.level-2 > :first-child {
      padding-left: 16px;
    }

    tr.highlight > td {
      color: #009aff;
    }
  }
`;

const StyledSpacer = styled.div.attrs(({ $size, ...props }) => ({ $size: $size ?? 1, ...props }))`
  display: block;
  clear: both;
  margin-bottom: calc(1rem * ${(p) => p.$size});
`;
