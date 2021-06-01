import React from "react";
import t from "prop-types";
import { Skeleton } from "antd";
import styled from "styled-components/macro";
import Web3 from "web3";
import { AutoDetectedTokenSymbol } from "./token-symbol";

const { fromWei } = Web3.utils;

export default function ETHAmount({ amount, decimals, tokenSymbol }) {
  if (amount === null) {
    return <StyledSkeleton active paragraph={false} title={SkeletonTitleProps} />;
  }

  const numericValue = Number(
    fromWei(typeof amount === "number" ? formatNumber(amount, { decimals: 0 }) : String(amount))
  );
  const value = formatNumber(decimals === 0 ? Math.trunc(numericValue) : numericValue, { decimals, useGrouping: true });

  return tokenSymbol === true ? (
    <>
      {value} <AutoDetectedTokenSymbol />
    </>
  ) : tokenSymbol === false ? (
    value
  ) : React.isValidElement(tokenSymbol) ? (
    <>
      {value} {tokenSymbol}
    </>
  ) : (
    <>
      {value} <AutoDetectedTokenSymbol token={tokenSymbol} />
    </>
  );
}

ETHAmount.propTypes = {
  amount: t.oneOfType([t.string.isRequired, t.number.isRequired, t.object.isRequired]),
  decimals: t.number,
  tokenSymbol: t.oneOfType([t.bool, t.string.isRequired, t.element.isRequired]),
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
