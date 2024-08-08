import { Card, Tooltip } from "antd";
import React, { Fragment, useEffect, useState } from "react";
import { ReactComponent as Hexagon } from "../assets/images/hexagon.svg";
import { ReactComponent as Question } from "../assets/images/question-circle.svg";
import PropTypes from "prop-types";
import { ReactComponent as Underline } from "../assets/images/underline.svg";
import styled from "styled-components/macro";
import useChainId from "../hooks/use-chain-id";
import { getStakingReward } from "../helpers/rewards";

const StyledCard = styled(Card)`
  background: none;
  cursor: initial;
  margin: 28px 0 0;

  .ant-card {
    &-body {
      background: white;
      border-radius: 12px;
      box-shadow: 0px 6px 36px #bc9cff;
      padding: 0;
    }
    &-head {
      background: linear-gradient(111.6deg, #4d00b4 46.25%, #6500b4 96.25%);
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
      color: white;
      margin: 0 0 11px;
    }
  }

  &.ant-card-wider-padding {
    .ant-card {
      &-head {
        padding: 0 24px;
      }

      &-body {
        padding: 0;
      }
    }
  }
`;
const StyledPrefixDiv = styled.div`
  font-size: 21px;
  font-weight: bold;
  left: 53px;
  position: absolute;
  top: 51px;
  transform: translate(-50%, -50%);
`;
const StyledTitleDiv = styled.div`
  font-size: 24px;
  font-weight: medium;
  left: 95px;
  max-width: 65%;
  overflow: hidden;
  position: absolute;
  text-overflow: ellipsis;
  top: 53px;
  transform: translateY(-50%);
  white-space: nowrap;
  width: 100%;
  @media (max-width: 1290px) {
    font-size: 20px;
  }
  @media (max-width: 1190px) {
    font-size: 16px;
  }
  @media (max-width: 991px) {
    font-size: 24px;
  }
`;
const StyledUnderline = styled(Underline)`
  height: 4px;
  left: 0;
  position: absolute;
  top: 103px;
  width: 100%;
`;
const StyledDivider = styled.div`
  border-bottom: 1px solid #d09cff;
  margin: 0;
  width: 100%;
`;

const StyledTooltipDiv = styled.span`
  position: absolute;
  font-size: 16px;
  font-weight: 500;
  right: 18px;
  top: 42.5px;
  .ant-tooltip-arrow {
    border-top-color: #009aff;
  }

  .ant-tooltip-inner {
    background-color: #009aff;
    color: white;
    min-width: 200px;
    padding: 16px;
    white-space: break-spaces;
  }
`;

const TitledListCard = ({ children, loading, prefix, title, apy }) => {
  const chainId = useChainId();
  const [realApy, setRealApy] = useState(undefined);

  useEffect(() => {
    if (!realApy && chainId && apy) {
      getStakingReward(chainId.toString(), apy).then((r) => setRealApy(r));
    }
  }, [apy, chainId]);

  return (
    <StyledCard
      bordered={false}
      hoverable
      loading={loading}
      title={
        <>
          {realApy && (
            <Tooltip
              title="The current rate. Subject to change depending on total staked amount."
              getPopupContainer={(triggerNode) => triggerNode}
            >
              <StyledTooltipDiv>
                {`${realApy.toFixed(2)}% APY`}
                <Question
                  style={{
                    verticalAlign: "text-bottom",
                    marginLeft: "8px",
                    height: "19px",
                    width: "auto",
                  }}
                />
              </StyledTooltipDiv>
            </Tooltip>
          )}

          <Hexagon className="ternary-fill" />
          <StyledPrefixDiv>{prefix}</StyledPrefixDiv>
          <StyledTitleDiv>{title}</StyledTitleDiv>
          <StyledUnderline className="primary-fill" />
        </>
      }
    >
      {children &&
        (children.length === undefined
          ? children
          : children.map((c, i) =>
              i < children.length - 2 ? (
                <Fragment key={i}>
                  {c}
                  <StyledDivider />
                </Fragment>
              ) : (
                c
              )
            ))}
    </StyledCard>
  );
};

TitledListCard.propTypes = {
  children: PropTypes.node,
  loading: PropTypes.bool,
  prefix: PropTypes.node,
  title: PropTypes.node.isRequired,
  apy: PropTypes.number,
};

TitledListCard.defaultProps = {
  children: null,
  loading: false,
  prefix: null,
};

export default TitledListCard;
