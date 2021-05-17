import React from "react";
import t from "prop-types";
import { Skeleton } from "antd";
import styled from "styled-components/macro";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import TokenSymbol from "./token-symbol";

const { useDrizzle } = drizzleReactHooks;

export default function ETHAmount({ amount, decimals, tokenSymbol }) {
  const { drizzle } = useDrizzle();

  if (amount === null) {
    return <StyledSkeleton active paragraph={false} title={SkeletonTitleProps} />;
  }

  const value = formatNumber(
    Number(
      drizzle.web3.utils.fromWei(typeof amount === "number" ? formatNumber(amount, { decimals: 0 }) : String(amount))
    ),
    { decimals, useGrouping: true }
  );

  return tokenSymbol === true ? (
    <>
      {value} <TokenSymbol />
    </>
  ) : tokenSymbol === false ? (
    value
  ) : (
    <>
      {value} <TokenSymbol token={tokenSymbol} />
    </>
  );
}

ETHAmount.propTypes = {
  amount: t.oneOfType([t.string.isRequired, t.number.isRequired, t.object.isRequired]),
  decimals: t.number,
  tokenSymbol: t.oneOfType([t.bool, t.string.isRequired]),
};

ETHAmount.defaultProps = {
  amount: null,
  decimals: 0,
  tokenSymbol: false,
};

const formatNumber = (number, { locale = [], useGrouping = false, decimals = 2 } = {}) =>
  new Intl.NumberFormat(locale, {
    useGrouping,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);

const SkeletonTitleProps = { width: 30 };

const StyledSkeleton = styled(Skeleton)`
  display: inline;

  .ant-skeleton-title {
    margin: -3px 0;
  }
`;
