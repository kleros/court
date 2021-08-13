import React from "react";
import t from "prop-types";
import clsx from "clsx";
import { Typography } from "antd";
import Web3 from "web3";
import styled from "styled-components/macro";
import EthAmount from "./eth-amount";
import TokenSymbol, { AutoDetectedTokenSymbol } from "./token-symbol";

const { BN } = Web3.utils;

export default function MultiBalance({ title, chainId, errors, balance, rawBalance, rowClassNames }) {
  const TokenSymbolComponent = chainId ? TokenSymbol : AutoDetectedTokenSymbol;
  const tokenSymbolProps = chainId ? { chainId } : {};
  const balanceTokenSymbol = <TokenSymbolComponent {...tokenSymbolProps} token="PNK" />;
  const rawBalanceTokenSymbol = <TokenSymbolComponent {...tokenSymbolProps} token="xPNK" />;

  return (
    <StyledMultiBalance>
      <StyledTitle level={3}>{title}</StyledTitle>
      <StyledContent>
        <table>
          <tbody>
            <EntryRow
              error={errors.rawBalance}
              description="Not stakeable:"
              value={rawBalance}
              tokenSymbol={rawBalanceTokenSymbol}
              className={rowClassNames?.rawBalance ?? "highlight"}
            />
            <EntryRow
              error={errors.balance}
              description="Stakeable:"
              value={balance}
              tokenSymbol={balanceTokenSymbol}
              className={rowClassNames?.balance ?? "muted"}
            ></EntryRow>
          </tbody>
        </table>
      </StyledContent>
    </StyledMultiBalance>
  );
}

MultiBalance.propTypes = {
  title: t.node,
  chainId: t.number,
  errors: t.object.isRequired,
  balance: t.oneOfType([t.string, t.number, t.instanceOf(BN), t.object]),
  rawBalance: t.oneOfType([t.string, t.number, t.instanceOf(BN), t.object]),
  rowClassNames: t.shape({
    balance: t.string,
    rawBalance: t.string,
  }),
};

MultiBalance.defaultProps = {
  title: "Your Balance",
  rowClassNames: {
    balance: "highlight",
    rawBalance: "muted",
  },
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

const StyledMultiBalance = styled.section``;

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
