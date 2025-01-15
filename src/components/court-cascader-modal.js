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
                    <div style={{ fontWeight: "400", fontSize: "12px", margin: "3px 0 20px 0" }}>
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
                    </div>
                  </Typography.Title>
                  <ReactMarkdown source={option.description} />
                  <ReactMarkdown source={option.summary} />
                </Col>
                <Col md={12} style={{ marginTop: "62px" }}>
                  {option.requiredSkills ? (
                    <Row gutter={16}>
                      <Col md={2} offset={2}>
                        <StyledPrefixDiv style={{ left: "7px", top: "35px" }}>
                          <Hexagon className="ternary-fill" />
                        </StyledPrefixDiv>
                        <StyledPrefixDiv style={{ left: "6px", top: "29px" }}>
                          <img src={skillsImg} alt="skills" style={{ maxWidth: "108%" }} />
                        </StyledPrefixDiv>
                      </Col>
                      <Col md={20}>
                        <Typography.Title level={2}>Required Skills</Typography.Title>
                        <ReactMarkdown source={option.requiredSkills} />
                        <br />
                      </Col>
                    </Row>
                  ) : null}
                  <Row gutter={16}>
                    <Col md={2} offset={2}>
                      <StyledPrefixDiv style={{ left: "7px", top: "35px" }}>
                        <Hexagon className="ternary-fill" />
                      </StyledPrefixDiv>
                      <StyledPrefixDiv style={{ left: "8px", top: "36px" }}>
                        <img src={rewardImg} alt="reward" style={{ maxWidth: "92%" }} />
                      </StyledPrefixDiv>
                    </Col>
                    <Col md={20}>
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
  height: 90vh;

  h1 {
    font-size: 20px;
    font-weight: bolder;
    color: #4d00b4;
  }

  h2 {
    font-size: 18px;
    font-weight: bolder;
    color: #4d00b4;
  }

  h3 {
    font-size: 16px;
    font-weight: bolder;
    color: #4d00b4;
  }

  .ant-modal {
    &-header {
      border: none;
      background: #4004a3;
    }

    &-close-icon svg {
      fill: white;
    }

    &-content {
      height: 100%;
      border-top-left-radius: 6px;
      border-top-right-radius: 6px;
    }

    &-title {
      text-align: center;
      color: #ffffff;
      font-size: 20px;
    }

    &-body {
      background: whitesmoke;
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
      color: #4d00b4;
      padding: 0;
      text-align: left;
      height: calc(90vh - 400px);
    }
  }
`;

const SelectButtonArea = styled.div`
  background: #4004a3;
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
    background: whitesmoke;
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
          color: white;
          .anticon {
            color: white;
          }
        }

        > .ant-cascader-menu-item-loading-icon {
          top: 50%;
          transform: translateY(-50%);
        }
      }
    }

    ul:nth-child(1) {
      background: #4004a3;
      border-radius: 0px;
    }

    ul:nth-child(3n + 1) {
      .ant-cascader-menu-item-active {
        background: #1e075f;
      }
    }

    ul:nth-child(3n + 2) {
      .ant-cascader-menu-item-active {
        background: #9013fe;
      }
    }

    ul:nth-child(3n) {
      .ant-cascader-menu-item-active {
        background: #009aff;
      }
    }
  }
`;

const StyledPrefixDiv = styled.div`
  position: absolute;
  transform: translate(-50%, -50%);
`;

const StyledPolicyWrapper = styled.div`
  padding: 24px;
  height: 100%;
`;

const StyledPolicyRow = styled(Row)`
  overflow: auto;
  height: 100%;
`;
