import PropTypes from "prop-types";
import React from "react";
import { Skeleton } from "antd";
import styled from "styled-components/macro";
import { drizzleReactHooks } from "@drizzle/react-plugin";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

export default function ETHAmount({ amount, decimals, suffix }) {
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

  return suffix === true ? (
    <>
      {value} <ETHSuffix />
    </>
  ) : suffix === false ? (
    value
  ) : (
    <>
      {value} {suffix}
    </>
  );
}

ETHAmount.propTypes = {
  amount: PropTypes.oneOfType([PropTypes.string.isRequired, PropTypes.number.isRequired, PropTypes.object.isRequired]),
  decimals: PropTypes.number,
  suffix: PropTypes.oneOfType([PropTypes.bool, PropTypes.node.isRequired]),
};

ETHAmount.defaultProps = {
  amount: null,
  decimals: 0,
  suffix: false,
};

function ETHSuffix() {
  const web3 = useDrizzleState(({ web3 }) => web3);
  const suffix = networkIdToSuffix[web3.networkId] || "ETH";
  return suffix;
}

const networkIdToSuffix = {
  1: "ETH",
  3: "ETH",
  42: "ETH",
  77: "SPOA",
  100: "xDAI",
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
