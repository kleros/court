import React from "react";
import t from "prop-types";
import clsx from "clsx";
import { Typography } from "antd";
import styled from "styled-components/macro";
import EthAmount from "./eth-amount";

export default function BalanceTable({ title, children }) {
  return (
    <StyledBalanceTableWrapper>
      <StyledTitle level={3}>{title}</StyledTitle>
      <StyledContent>
        <table>
          <tbody>{children}</tbody>
        </table>
      </StyledContent>
    </StyledBalanceTableWrapper>
  );
}

BalanceTable.propTypes = {
  title: t.node.isRequired,
  children: t.oneOfType([t.node, t.arrayOf(t.node)]).isRequired,
};

BalanceTable.Row = Row;
BalanceTable.EmptyRow = EmptyRow;

function Row({ description, error, value, tokenSymbol, variant, level }) {
  return (
    <tr className={clsx(variant, `level-${level}`, { error: Boolean(error) })}>
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

Row.propTypes = {
  description: t.node.isRequired,
  error: t.instanceOf(Error),
  value: t.oneOfType([t.string, t.number, t.object]),
  tokenSymbol: t.node.isRequired,
  variant: t.oneOf(["default", "primary", "warning"]),
  level: t.number,
};

Row.defaultProps = {
  variant: "default",
  level: 0,
};

function EmptyRow() {
  return (
    <tr>
      <td className="empty" colSpan={3}></td>
    </tr>
  );
}

const StyledBalanceTableWrapper = styled.section``;

const StyledTitle = styled(Typography.Title)`
  text-align: center;
`;

const StyledContent = styled.main`
  background: ${({ theme }) => theme.componentBackground};
  border: 1px solid ${({ theme }) => theme.borderColor};
  box-shadow: ${({ theme }) => theme.cardShadow};
  border-radius: 18px;
  padding: 24px 30px;
  color: ${({ theme }) => theme.textSecondary};

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
    }

    td {
      font-weight: bold;
    }

    td.amount {
      width: 100%;
      text-align: right;
    }

    th,
    td.token {
      white-space: nowrap;
    }

    tr.spacer > td {
      text-indent: -9999px;
    }

    tr.level-1 > :first-child {
      padding-left: 16px;
    }

    tr.level-2 > :first-child {
      padding-left: 32px;
    }

    tr.level-3 > :first-child {
      padding-left: 48px;
    }

    tr.primary {
      color: ${({ theme }) => theme.textPrimary};

      > td.amount,
      > td.token {
        color: ${({ theme }) => theme.primaryColor};
      }
    }

    tr.warning {
      > td.amount,
      > td.token {
        color: ${({ theme }) => theme.warningColor};
      }
    }

    td.error {
      color: ${({ theme }) => theme.errorColor};
    }

    td.empty::before {
      content: "Empty cell";
      visibility: hidden;
      speak: none;
    }
  }
`;
