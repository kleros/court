import React, { useMemo } from "react";
import t from "prop-types";
import clsx from "clsx";
import { Typography } from "antd";
import Web3 from "web3";
import styled from "styled-components/macro";
import EthAmount from "./eth-amount";
import { getTokenSymbol } from "../helpers/get-token-symbol";

const { BN } = Web3.utils;

export default function MultiBalance({ title, chainId, errors, balance, rawBalance, rowClassNames }) {
  const [balanceTokenSymbol, rawBalanceTokenSymbol] = useMemo(
    () => (chainId ? [getTokenSymbol(chainId, "PNK"), getTokenSymbol(chainId, "xPNK")] : ["PNK", "xPNK"]),
    [chainId]
  );

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
  && {
    text-align: center;
    color: ${({ theme }) => theme.textPrimary};
  }
`;

const StyledContent = styled.main`
  background: ${({ theme }) => theme.componentBackground};
  border: 1px solid ${({ theme }) => theme.borderColor};
  box-shadow: ${({ theme }) => theme.cardShadow};
  border-radius: 18px;
  padding: 24px 30px;
  color: ${({ theme }) => theme.textPrimary};

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead {
    th {
      color: ${({ theme }) => theme.textSecondary};
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
      color: ${({ theme }) => theme.textSecondary};
    }

    td {
      font-weight: bold;
      color: ${({ theme }) => theme.textPrimary};
    }

    td.amount {
      width: 100%;
      text-align: right;
    }

    td.error {
      color: ${({ theme }) => theme.errorColor};
    }

    th,
    td.token {
      white-space: nowrap;
    }

    tr.muted {
      color: ${({ theme }) => theme.textSecondary};
    }

    tr.spacer > td {
      text-indent: -9999px;
    }

    tr.level-2 > :first-child {
      padding-left: 16px;
    }

    tr.highlight > td {
      color: ${({ theme }) => theme.primaryColor};
    }
  }
`;
