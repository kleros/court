import React, { useMemo } from "react";
import t from "prop-types";
import { Skeleton } from "antd";
import styled from "styled-components/macro";
import Web3 from "web3";
import { getTokenSymbol } from "../helpers/get-token-symbol";
import { drizzleReactHooks } from "@drizzle/react-plugin";

const { useDrizzleState } = drizzleReactHooks;
const { fromWei } = Web3.utils;

export default function ETHAmount({ amount, decimals, tokenSymbol }) {
  const chainId = useDrizzleState((ds) => ds.web3.networkId);

  let finalDecimals = decimals;
  const chainTokenSymbol = useMemo(() => getTokenSymbol(chainId), [chainId]);
  const calculatedTokenSymbol = useMemo(() => getTokenSymbol(chainId, tokenSymbol), [chainId, tokenSymbol]);

  if (chainTokenSymbol === "xDAI" && tokenSymbol === true) {
    finalDecimals = 2;
  }

  if (amount === null) {
    return <StyledSkeleton active paragraph={false} title={SkeletonTitleProps} />;
  }

  const numericValue = Number(
    fromWei(typeof amount === "number" ? formatNumber(amount, { decimals: 0 }) : String(amount))
  );
  const value = formatNumber(finalDecimals === 0 ? Math.trunc(numericValue) : numericValue, {
    decimals: finalDecimals,
    useGrouping: true,
  });

  return tokenSymbol === true ? (
    <>
      {value} {chainTokenSymbol}
    </>
  ) : tokenSymbol === false ? (
    value
  ) : React.isValidElement(tokenSymbol) ? (
    <>
      {value} {tokenSymbol}
    </>
  ) : (
    <>
      {value} {calculatedTokenSymbol}
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
