import { Button, Cascader, Col, Modal, Row, Skeleton, Tooltip, Typography } from "antd";
import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import ReactMarkdown from "react-markdown";
import styled from "styled-components/macro";
import { ReactComponent as Hexagon } from "../assets/images/hexagon.svg";
import skillsImg from "../assets/images/skills.png";
import rewardImg from "../assets/images/reward.png";
import { useDataloader, VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import ETHAmount from "./eth-amount";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const ALPHA_DIVISOR = 1e4;

const CourtCascaderModal = ({ onClick }) => {
  const { drizzle, useCacheCall } = useDrizzle();
  const loadPolicy = useDataloader.loadPolicy();
  const [subcourtIDs, setSubcourtIDs] = useState(["0"]);
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
  const subcourtSelected = useCallback((subcourtIDs) => {
    setSubcourtIDs(subcourtIDs);
    setTimeout(() => {
      const lastSubcourtList = [...document.getElementsByClassName("ant-cascader-menu")].filter(
        (e) => e.children.length > 0
      );
      if (lastSubcourtList.length > 0) {
        lastSubcourtList[lastSubcourtList.length - 1].scrollIntoView({
          behavior: "smooth",
        });
      }
    }, 1500);
  }, []);
  const options = useCacheCall(["PolicyRegistry", "KlerosLiquid"], (call) => {
    const options = [
      {
        children: undefined,
        description: undefined,
        label: undefined,
        loading: false,
        summary: undefined,
        value: subcourtIDs[0],
      },
    ];
    let option = options[0];
    for (let i = 0; i < subcourtIDs.length; i++) {
      const policy = call("PolicyRegistry", "policies", subcourtIDs[i]);
      if (policy !== undefined) {
        const policyJSON = loadPolicy(policy);
        if (policyJSON) {
          option.description = policyJSON.description;
          option.label = policyJSON.name;
          option.summary = policyJSON.summary;
          option.requiredSkills = policyJSON.requiredSkills;
        }
      }
      const subcourt = call("KlerosLiquid", "getSubcourt", subcourtIDs[i]);
      if (subcourt)
        option.children = subcourt.children.map((c) => {
          const child = {
            children: undefined,
            description: undefined,
            label: undefined,
            loading: false,
            summary: undefined,
            value: c,
          };
          const policy = call("PolicyRegistry", "policies", c);
          if (policy !== undefined) {
            const policyJSON = loadPolicy(policy);
            if (policyJSON) {
              child.description = policyJSON.description;
              child.label = policyJSON.name;
              child.summary = policyJSON.summary;
            }
          }
          if (child.label === undefined) child.loading = true;
          return child;
        });
      if (option.label === undefined || !subcourt || option.children.some((c) => c.loading)) {
        option.loading = true;
        break;
      }
      option = option.children.find((c) => c.value === subcourtIDs[i + 1]);
    }
    return options;
  });
  const option = subcourtIDs.reduce((acc, ID, i) => {
    const index = acc.findIndex((option) => option.value === ID);
    return i === subcourtIDs.length - 1
      ? {
          label: acc[index].label,
          description: acc[index].description,
          loading: acc[index].loading,
          summary: acc[index].summary,
          requiredSkills: acc[index].requiredSkills,
          courtID: ID,
        }
      : acc[index].children;
  }, options);
  const _court = useCacheCall("KlerosLiquid", "courts", option.courtID) || null;
  let minStake;
  let feeForJuror;
  let subcourtAlpha;
  if (_court !== null) {
    minStake = drizzle.web3.utils.toBN(_court.minStake);
    feeForJuror = drizzle.web3.utils.toBN(_court.feeForJuror);
    subcourtAlpha = drizzle.web3.utils.toBN(_court.alpha);
  }

  const lastSubcourt = subcourtIDs[subcourtIDs.length - 1];

  return (
    <StyledModal
      centered
      footer={
        <>
          <SelectButtonArea>
            <Tooltip title={drizzleState.account === VIEW_ONLY_ADDRESS && "A Web3 wallet is required"}>
              <StyledButton
                onClick={useCallback(() => drizzleState.account !== VIEW_ONLY_ADDRESS && onClick(lastSubcourt), [
                  drizzleState.account,
                  onClick,
                  lastSubcourt,
                ])}
                type="primary"
              >
                Stake
              </StyledButton>
            </Tooltip>
          </SelectButtonArea>
          <StyledPolicyWrapper>
            <Skeleton active loading={option.loading}>
              <StyledPolicyRow gutter={16}>
                <Col md={12}>
                  <Typography.Title level={1}>
                    {option.label}
                    <StyledMinStakeDisplay>
                      Min Stake = <ETHAmount amount={minStake} decimals={0} tokenSymbol="PNK" /> | Each vote has a stake
                      of{" "}
                      <ETHAmount
                        amount={
                          minStake &&
                          subcourtAlpha &&
                          minStake.mul(subcourtAlpha).div(drizzle.web3.utils.toBN(ALPHA_DIVISOR))
                        }
                        decimals={0}
                        tokenSymbol="PNK"
                      />
                      .
                    </StyledMinStakeDisplay>
                  </Typography.Title>
                  <ReactMarkdown source={option.description} />
                  <ReactMarkdown source={option.summary} />
                </Col>
                <Col md={12} style={{ marginTop: "62px" }}>
                  {option.requiredSkills ? (
                    <Row gutter={16}>
                      <Col span={2} offset={2}>
                        <StyledPrefixDiv>
                          <Hexagon className="ternary-fill" />
                          <img src={skillsImg} alt="skills" style={{ maxWidth: "108%" }} />
                        </StyledPrefixDiv>
                      </Col>
                      <Col span={20}>
                        <Typography.Title level={2}>Required Skills</Typography.Title>
                        <ReactMarkdown source={option.requiredSkills} />
                        <br />
                      </Col>
                    </Row>
                  ) : null}
                  <Row gutter={16}>
                    <Col span={2} offset={2}>
                      <StyledPrefixDiv>
                        <Hexagon className="ternary-fill" />
                        <img src={rewardImg} alt="reward" style={{ maxWidth: "92%" }} />
                      </StyledPrefixDiv>
                    </Col>
                    <Col span={20}>
                      <Typography.Title level={2}>Reward</Typography.Title>
                      <div>
                        For each coherent vote you will receive{" "}
                        <strong>
                          <ETHAmount amount={feeForJuror || null} decimals={3} tokenSymbol={true} />
                        </strong>
                        .
                      </div>
                    </Col>
                  </Row>
                </Col>
              </StyledPolicyRow>
            </Skeleton>
          </StyledPolicyWrapper>
        </>
      }
      onCancel={useCallback(() => onClick(), [onClick])}
      title="Join Court"
      visible
    >
      <StyledCascader
        changeOnSelect
        getPopupContainer={useCallback(() => document.getElementsByClassName("ant-modal-body")[0], [])}
        onChange={subcourtSelected}
        options={options}
        popupClassName="popupClassName"
        popupVisible
        value={subcourtIDs}
      />
    </StyledModal>
  );
};

CourtCascaderModal.propTypes = {
  onClick: PropTypes.func.isRequired,
};

export default CourtCascaderModal;

const StyledModal = styled(Modal)`
  position: relative;
  isolation: isolate;
  padding-bottom: 0;
  width: 90% !important;
  max-width: calc(100vw - 32px);
  height: 90vh;

  h1 {
    font-size: 20px;
    font-weight: bolder;
    color: ${({ theme }) => theme.textPrimary};
  }

  h2 {
    font-size: 18px;
    font-weight: bolder;
    color: ${({ theme }) => theme.textPrimary};
  }

  h3 {
    font-size: 16px;
    font-weight: bolder;
    color: ${({ theme }) => theme.textPrimary};
  }

  .ant-modal {
    &-header {
      border: none;
      background: ${({ theme }) => theme.secondaryPurple};
    }

    &-close-icon svg {
      fill: ${({ theme }) => theme.textOnPurple};
    }

    &-content {
      height: 100%;
      border-top-left-radius: 6px;
      border-top-right-radius: 6px;
      background: ${({ theme }) => theme.componentBackground};
    }

    &-title {
      text-align: center;
      color: ${({ theme }) => theme.textOnPurple};
      font-size: 20px;
    }

    &-body {
      background: ${({ theme }) => theme.elevatedBackground};
      height: 286px;
      overflow: hidden;
      position: relative;
      padding: 0;
    }

    &-body::scrollbar,
    &-body::-webkit-scrollbar {
      display: none;
    }

    &-footer {
      border: none;
      color: ${({ theme }) => theme.textPrimary};
      padding: 0;
      text-align: left;
      height: calc(90vh - 400px);
    }
  }
`;

const SelectButtonArea = styled.div`
  background: ${({ theme }) => theme.secondaryPurple};
  padding: 0;
  display: flex;
  align-items: center;
  height: 60px;
  padding: 0 24px;
`;

const StyledButton = styled(Button)`
  border-radius: 3px;
  width: 100px;

  ${SelectButtonArea} > &:last-of-type {
    margin-left: auto;
  }
`;

const StyledCascader = styled(Cascader)`
  display: none;

  & ~ div .popupClassName {
    background: ${({ theme }) => theme.elevatedBackground};
    width: 100%;
    border-radius: 0;
    left: 0 !important;
    top: 0 !important;

    .ant-cascader-menu {
      position: relative;
      height: 286px;
      width: 226px;
      padding-top: 0;
      padding-bottom: 0;
      border: 0;
      border-radius: 0;

      &-item {
        position: relative;
        line-height: 28px;
        min-height: 38px;
        padding: 5px 18px;
        white-space: normal;

        &-active {
          color: ${({ theme }) => theme.textOnPurple};
          .anticon {
            color: ${({ theme }) => theme.textOnPurple};
          }
        }

        > .ant-cascader-menu-item-loading-icon {
          top: 50%;
          transform: translateY(-50%);
        }
      }
    }

    ul:nth-child(1) {
      background: ${({ theme }) => theme.secondaryPurple};
      border-radius: 0px;

      /* First column always has purple bg, so loading icons should be white */
      .ant-cascader-menu-item-loading-icon .anticon {
        color: ${({ theme }) => theme.textOnPurple};
      }
    }

    ul:nth-child(3n + 1) {
      .ant-cascader-menu-item-active {
        background: ${({ theme }) => theme.secondaryPurple};
      }
    }

    ul:nth-child(3n + 2) {
      .ant-cascader-menu-item-active {
        background: ${({ theme }) => theme.accentPurple};
      }
    }

    ul:nth-child(3n) {
      .ant-cascader-menu-item-active {
        background: ${({ theme }) => theme.primaryColor};
      }
    }

    /* Loading spinner colors for all menu items */
    .ant-cascader-menu-item-loading-icon {
      .anticon-loading,
      .anticon-loading svg,
      .anticon {
        color: ${({ theme }) => theme.textSecondary};
      }
    }

    /* Loading spinner in active items should be white */
    .ant-cascader-menu-item-active .ant-cascader-menu-item-loading-icon {
      .anticon-loading,
      .anticon-loading svg,
      .anticon {
        color: ${({ theme }) => theme.textOnPurple};
      }
    }
  }
`;

const StyledPrefixDiv = styled.div`
  position: absolute;
  transform: translate(-50%, -50%);
  left: 8px;
  top: 36px;

  img {
    position: absolute;
    right: 50%;
    top: 50%;
    transform: translate(50%, -50%);
  }
`;

const StyledPolicyWrapper = styled.div`
  padding: 24px;
  height: 100%;
`;

const StyledPolicyRow = styled(Row)`
  overflow: auto;
  height: 100%;
`;

const StyledMinStakeDisplay = styled.div`
  font-weight: 400;
  font-size: 12px;
  margin: 3px 0 20px 0;
`;
