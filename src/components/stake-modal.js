import React, { useCallback, useMemo } from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Alert, Col, Form, InputNumber, Modal, Row, Skeleton } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import Web3 from "web3";
import infoImg from "../assets/images/info.png";
import { useDataloader, VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import useAccount from "../hooks/use-account";
import useChainId from "../hooks/use-chain-id";
import { getTokenSymbol } from "../helpers/get-token-symbol";
import ETHAmount from "./eth-amount";
import { isSupportedSideChain } from "../api/side-chain";
import SideChainPnkActions from "./side-chain/pnk-actions";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const { BN, toBN, fromWei, toWei } = Web3.utils;

export default function StakeModal({ ID, onCancel }) {
  const chainId = useChainId();
  const { useCacheCall } = useDrizzle();
  const account = useAccount();
  const _balance = useCacheCall("MiniMeTokenERC20", "balanceOf", account);
  const balance = _balance && toBN(_balance);
  const juror = useCacheCall("KlerosLiquidExtraViews", "getJuror", account);
  const stakedTokens = juror && toBN(juror.stakedTokens);
  const max = balance && stakedTokens ? balance.sub(stakedTokens) : toBN("0");

  const hasBalance = balance?.gt(toBN("0")) ?? true;

  return isSupportedSideChain(chainId) && !hasBalance ? (
    <SideChainPnkActions unwrappedPnkModalProps={{ triggerCondition: "auto" }} />
  ) : (
    <StakeModalForm ID={ID} onCancel={onCancel} stakedTokens={stakedTokens} max={max} />
  );
}

StakeModal.propTypes = {
  ID: t.string.isRequired,
  onCancel: t.func.isRequired,
};

/**
 * Recommended to have 2000+ PNK unstaked to avoid being unstaked after losing a case.
 */
const RECOMMENDED_UNSTAKED_BUFFER = toBN("2000000000000000000000");

const StakeModalForm = Form.create()(({ ID, form, onCancel, stakedTokens, max }) => {
  const chainId = useDrizzleState((ds) => ds.web3.networkId);
  const { useCacheCall, useCacheSend } = useDrizzle();
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
  const loadPolicy = useDataloader.loadPolicy();
  let name;
  const policy = useCacheCall("PolicyRegistry", "policies", ID);
  if (policy !== undefined) {
    const policyJSON = loadPolicy(policy);
    if (policyJSON) name = policyJSON.name;
  }
  const _stake = useCacheCall("KlerosLiquidExtraViews", "stakeOf", drizzleState.account, ID);
  const stake = _stake && toBN(_stake);
  const subcourt = useCacheCall("KlerosLiquid", "courts", ID);
  const minStake = subcourt ? toBN(subcourt.minStake) : toBN("0");
  const min = stake && minStake ? minStake.sub(stake) : toBN("0");
  const recommendedBalanceBuffer = RECOMMENDED_UNSTAKED_BUFFER;
  const maxRecommendedStake = BN.max(toBN("0"), BN.max(min, max.sub(recommendedBalanceBuffer)));
  const selectedStakeValue = Number.parseInt(String(form.getFieldValue("PNK")));
  const selectedStake = toBN(toWei(String(Number.isNaN(selectedStakeValue) ? 0 : selectedStakeValue)));
  const shouldShowMaxStakeAlert = selectedStake.gt(maxRecommendedStake) && selectedStake.lte(max);
  const pnkTokenSymbol = useMemo(() => getTokenSymbol(chainId, "PNK"), [chainId]);

  const loading = !min || !max;
  const { send, status } = useCacheSend("KlerosLiquid", "setStake");
  const hasError = Object.values(form.getFieldsError()).some((v) => v);

  return (
    <StyledModal
      cancelText="Back"
      centered
      closable={false}
      confirmLoading={loading || status === "pending"}
      maskClosable
      okButtonProps={useMemo(
        () => ({
          disabled: hasError,
          htmlType: "submit",
        }),
        [hasError]
      )}
      okText="Stake"
      onCancel={useCallback(() => onCancel(), [onCancel])}
      onOk={useCallback(
        () =>
          form.validateFieldsAndScroll((err, values) => {
            if (!err)
              send(
                ID,
                String(stake.add(toBN(toWei(typeof values.PNK === "string" ? values.PNK : String(values.PNK)))))
              );
          }),
        [ID, stake, form, send]
      )}
      title={
        <>
          Stake {pnkTokenSymbol} in {name || "-"}
        </>
      }
      visible
      width="480px"
    >
      <StyledRow>
        <AvailableStake>
          <div>Available to Stake</div>
          <StyledAmountDiv style={{ marginBottom: "10px" }}>
            <ETHAmount amount={max} tokenSymbol="PNK" />
          </StyledAmountDiv>
          <div>
            ({pnkTokenSymbol} in your wallet - {pnkTokenSymbol} already staked)
          </div>
        </AvailableStake>
      </StyledRow>
      <StyledRow gutter={24}>
        <Col span={12}>
          <AmountBox>
            Min Stake
            <StyledAmountDiv>
              <ETHAmount amount={minStake} tokenSymbol="PNK" />
            </StyledAmountDiv>
          </AmountBox>
        </Col>
        <Col span={12}>
          <AmountBox>
            Total Staked
            <StyledAmountDiv>
              <ETHAmount amount={stakedTokens} tokenSymbol="PNK" />
            </StyledAmountDiv>
          </AmountBox>
        </Col>
      </StyledRow>
      <StyledForm>
        <Skeleton active loading={loading}>
          {!loading && (
            <>
              <Form.Item
                colon={false}
                extra={
                  <div style={{ marginTop: "5px" }}>
                    <img src={infoImg} style={{ marginRight: "5px" }} alt="info" />
                    Enter a negative value to unstake.
                  </div>
                }
                hasFeedback
                label={pnkTokenSymbol}
              >
                {form.getFieldDecorator("PNK", {
                  initialValue: fromWei(String(maxRecommendedStake)),
                  rules: [
                    {
                      message: "Your new court stake must be higher than the min stake.",
                      validator: (_, _value, callback) => {
                        if (_value === undefined || _value === "" || _value === "-") return callback();
                        const value = toBN(
                          toWei(
                            typeof _value === "number"
                              ? _value.toLocaleString("fullwide", {
                                  useGrouping: false,
                                })
                              : typeof _value === "string"
                              ? _value
                              : String(_value)
                          )
                        );
                        callback(value.gte(min) ? undefined : true);
                      },
                    },
                    {
                      message: (
                        <>
                          You only have{" "}
                          <StyledValidatorAmountSpan>
                            <ETHAmount amount={max} token="PNK" />
                          </StyledValidatorAmountSpan>{" "}
                          available to stake.
                        </>
                      ),
                      validator: (_, _value, callback) => {
                        if (_value === undefined || _value === "" || _value === "-") return callback();
                        const value = toBN(
                          toWei(
                            typeof _value === "number"
                              ? _value.toLocaleString("fullwide", {
                                  useGrouping: false,
                                })
                              : typeof _value === "string"
                              ? _value
                              : String(_value)
                          )
                        );

                        const isValid = max.gte(toBN("0")) ? value.lte(max) : value.gte(max);
                        callback(isValid ? undefined : true);
                      },
                    },
                  ],
                })(
                  <StyledInputNumber
                    parser={useCallback((valueAsString) => {
                      valueAsString = valueAsString.replace(/(?!^-|\.)\D|\.(?![^.]*$)/g, "");
                      const index = valueAsString.indexOf(".");
                      return index === -1
                        ? valueAsString
                        : `${valueAsString.slice(0, index)}${valueAsString.slice(index, index + 19)}`;
                    }, [])}
                    precision={0}
                  />
                )}
              </Form.Item>
              {shouldShowMaxStakeAlert ? (
                <Alert
                  closable
                  type="info"
                  message="Tip"
                  description={
                    <>
                      <p>
                        In case you stake all PNK you have available, then voting incoherently, your PNK balance may
                        become lower than the stake. This unstakes you from the courts automatically.
                      </p>
                      <p>
                        In order to avoid this scenario, we recommend you to have at least{" "}
                        <strong>{fromWei(RECOMMENDED_UNSTAKED_BUFFER)} unstaked PNK</strong> in your wallet.
                      </p>
                    </>
                  }
                />
              ) : null}
            </>
          )}
        </Skeleton>
        {status && status !== "pending" && (
          <Alert
            closable
            message={
              status === "success"
                ? "Stake set. Note this can take up to a few hours to be effective."
                : "Failed to set stake. Please try again."
            }
            type={status}
          />
        )}
      </StyledForm>
    </StyledModal>
  );
});

StakeModalForm.propTypes = {
  ID: t.string.isRequired,
  onCancel: t.func.isRequired,
};

const StyledModal = styled(Modal)`
  max-width: calc(100vw - 32px);

  .ant-modal {
    &-content {
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
      background: ${({ theme }) => theme.componentBackground};
    }

    &-body {
      padding: 35px 41px;

      @media (max-width: 575px) {
        padding: 24px 16px;
      }
    }

    &-header {
      background: ${({ theme }) => theme.cardHeaderBackground};
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
      height: 55px;
      text-align: center;
    }

    &-title {
      color: ${({ theme }) => theme.textOnPurple};
      font-size: 18px;
    }

    &-footer {
      border: none;
      padding: 0px 41px 35px 41px;

      @media (max-width: 575px) {
        padding: 0px 16px 24px 16px;
      }

      div {
        display: flex;
        justify-content: space-between;
      }

      button {
        font-size: 14px;
        height: 40px;
        min-width: 110px;
      }

      .ant-btn {
        background: none;
        border: 1px solid ${({ theme }) => theme.primaryPurple};
        border-radius: 3px;
        color: ${({ theme }) => theme.primaryPurple};

        &-primary {
          background: ${({ theme }) => theme.primaryColor};
          border: 1px solid ${({ theme }) => theme.primaryColor};
          color: ${({ theme }) => theme.primaryButtonText};
        }

        &-primary:hover,
        &-primary:focus {
          background: ${({ theme }) => theme.primaryColor};
          border: 1px solid ${({ theme }) => theme.primaryColor};
          color: ${({ theme }) => theme.primaryButtonText};
          filter: brightness(1.1);
        }

        &-primary:disabled {
          background: grey;
        }
      }
    }
  }
`;

const StyledForm = styled(Form)`
  .ant-form-item {
    &-label {
      line-height: 30px;

      label {
        color: ${({ theme }) => theme.textPrimary} !important;
        font-size: 14px;
        font-weight: 500;
        line-height: 16px;
      }
    }

    .ant-input-number {
      height: 40px;

      input {
        border: 1px solid ${({ theme }) => theme.borderColor};
        border-radius: 3px;
        box-sizing: border-box;
        color: ${({ theme }) => theme.textPrimary};
        font-size: 18px;
        font-weight: 500;
        height: 40px;
        line-height: 21px;
        background: ${({ theme }) => theme.inputBackground};
      }
    }

    .ant-form-extra {
      color: ${({ theme }) => theme.textPrimary};
      font-size: 12px;
      font-style: italic;
      line-height: 14px;
    }

    .agreement-text {
      color: ${({ theme }) => theme.textPrimary};
      font-size: 14px;
      line-height: 16px;
      padding-left: 12px;
    }
    .agreement-checkbox {
      line-height: 16px;
    }
  }
`;

const StyledAmountDiv = styled.div`
  color: inherit;
  font-size: 18px;
  font-weight: bold;
`;

const StyledValidatorAmountSpan = styled.span`
  font-style: italic;
  font-weight: bold;
`;

const StyledInputNumber = styled(InputNumber)`
  width: 100%;
`;

const StyledRow = styled(Row)`
  margin-bottom: 15px;
`;

const AvailableStake = styled.div`
  background: linear-gradient(
    164.87deg,
    ${({ theme }) => theme.gradientStart} 23.35%,
    ${({ theme }) => theme.gradientEnd} 62.96%
  );
  border: 4px solid ${({ theme }) => theme.borderColor};
  border-radius: 12px;
  box-sizing: border-box;
  color: ${({ theme }) => theme.textOnPurple};
  padding: 30px 0;
  text-align: center;
  width: 100%;
`;

const AmountBox = styled.div`
  background: ${({ theme }) => theme.componentBackground};
  border: 4px solid ${({ theme }) => theme.borderColor};
  border-radius: 12px;
  box-sizing: border-box;
  color: ${({ theme }) => theme.textPrimary};
  padding: 23px 30px;
  text-align: center;
  width: 100%;
`;
