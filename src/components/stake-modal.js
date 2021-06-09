import React, { useCallback, useMemo } from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Alert, Col, Form, InputNumber, Modal, Row, Skeleton } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import Web3 from "web3";
import infoImg from "../assets/images/info.png";
import { useDataloader, VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import { chainIdToNetworkName } from "../helpers/networks.js";
import useAccount from "../hooks/use-account";
import useChainId from "../hooks/use-chain-id";
import { AutoDetectedTokenSymbol } from "./token-symbol";
import ETHAmount from "./eth-amount";
import { isSupportedSideChain, TokenBridgeApiProvider, useTokenBridgeApi } from "../api/token-bridge";
import { useSetRequiredChainId } from "./required-chain-id-gateway";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const { BN, toBN, fromWei, toWei } = Web3.utils;

/**
 * The interface does not allow staking less than 1 PNK (which is 10^18 weiPNK).
 */
const MIN_STAKEABLE_AMOUNT = toBN("1000000000000000000");

export default function StakeModal({ ID, onCancel }) {
  const { drizzle, useCacheCall } = useDrizzle();
  const account = useAccount();
  const chainId = useChainId();
  const _balance = useCacheCall("MiniMeTokenERC20", "balanceOf", account);
  const balance = _balance && toBN(_balance);
  const juror = useCacheCall("KlerosLiquidExtraViews", "getJuror", account);
  const stakedTokens = juror && toBN(juror.stakedTokens);
  const max = balance && stakedTokens ? balance.sub(stakedTokens) : toBN("0");

  const hasEnoughBalance = balance ? balance.gte(toBN("0")) : true;

  return hasEnoughBalance || !isSupportedSideChain(chainId) ? (
    <StakeModalForm ID={ID} onCancel={onCancel} stakedTokens={stakedTokens} max={max} />
  ) : (
    <TokenBridgeApiProvider web3Provider={drizzle.web3.currentProvider}>
      <NoTokensOnSideChainWarning />
    </TokenBridgeApiProvider>
  );
}

StakeModal.propTypes = {
  ID: t.string.isRequired,
  onCancel: t.func.isRequired,
};

function NoTokensOnSideChainWarning() {
  const tokenBridgeApi = useTokenBridgeApi();
  const originChainId = tokenBridgeApi.origin.chainId;
  const destinationChainId = tokenBridgeApi.destination.chainId;
  const switchToDestinationChain = tokenBridgeApi.destination.switchChain;

  const setRequiredChainId = useSetRequiredChainId();

  const switchNetwork = React.useCallback(async () => {
    try {
      await switchToDestinationChain();
    } catch (err) {
      /**
       * If the call fails, it means that it's not supported.
       * This happens for the native Ethereum Mainnet and well-known testnets,
       * such as Ropsten and Kovan. Apparently this is due to security reasons.
       * @see { @link https://docs.metamask.io/guide/rpc-api.html#wallet-addethereumchain }
       */
      setRequiredChainId(destinationChainId, { location: "/token-bridge" });
    }
  }, [switchToDestinationChain, setRequiredChainId, destinationChainId]);

  const networkName = chainIdToNetworkName[originChainId];

  const [visible, setVisible] = React.useState(true);

  return (
    <StyledModal
      centered
      closable={false}
      maskClosable
      visible={visible}
      okText={
        <span>
          Get <AutoDetectedTokenSymbol token="PNK" />
        </span>
      }
      onOk={switchNetwork}
      cancelText="Ignore"
      onCancel={() => setVisible(false)}
      title={
        <>
          Insufficient <AutoDetectedTokenSymbol token="PNK" />
        </>
      }
    >
      <p
        css={`
          color: rgba(0, 0, 0, 0.85);
          text-align: center;
        `}
      >
        In order to use Kleros Court on {networkName}, you need to convert your PNK into stPNK (the wrapped PNK used for
        staking on {networkName} courts).
      </p>
    </StyledModal>
  );
}

/**
 * Recommended to have 2000+ PNK unstaked to avoid being unstaked after losing a case.
 */
const RECOMMENDED_UNSTAKED_BUFFER = toBN("2000000000000000000000");

const StakeModalForm = Form.create()(({ ID, form, onCancel, stakedTokens, max }) => {
  const { drizzle, useCacheCall, useCacheSend } = useDrizzle();
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
  const maxRecommendedStake = BN.max(min, max.sub(recommendedBalanceBuffer));
  const selectedStakeValue = Number.parseInt(String(form.getFieldValue("PNK")));
  const selectedStake = toBN(toWei(String(Number.isNaN(selectedStakeValue) ? 0 : selectedStakeValue)));
  const shouldShowMaxStakeAlert = selectedStake.gt(maxRecommendedStake) && selectedStake.lte(max);

  const hasEnoughStakeableTokens = stakedTokens !== undefined ? max.gte(MIN_STAKEABLE_AMOUNT) : true;
  const chainId = useChainId();
  const shouldShowSwitchNetworkAlert = hasEnoughStakeableTokens || !isSupportedSideChain(chainId);

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
          Stake <AutoDetectedTokenSymbol token="PNK" /> in {name || "-"}
        </>
      }
      visible
      width="480px"
    >
      <StyledRow>
        <AvailableStake>
          <div>Available to Stake</div>
          <StyledAmountDiv style={{ marginBottom: "10px" }}>
            <ETHAmount amount={max} /> PNK
          </StyledAmountDiv>
          <div>(PNK in your wallet - PNK already staked)</div>
        </AvailableStake>
      </StyledRow>
      <StyledRow gutter={24}>
        <Col span={12}>
          <AmountBox>
            Min Stake
            <StyledAmountDiv>
              <ETHAmount amount={minStake} /> PNK
            </StyledAmountDiv>
          </AmountBox>
        </Col>
        <Col span={12}>
          <AmountBox>
            Total Staked
            <StyledAmountDiv>
              <ETHAmount amount={stakedTokens} /> PNK
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
                label="PNK"
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
                            <ETHAmount amount={max} /> PNK
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
              {shouldShowSwitchNetworkAlert ? (
                <TokenBridgeApiProvider web3Provider={drizzle.web3.currentProvider}>
                  <NoTokensOnSideChainWarning />
                </TokenBridgeApiProvider>
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
  max-width: 90%;

  .ant-modal {
    &-content {
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
    }

    &-body {
      padding: 35px 41px;
    }

    &-header {
      background: #4d00b4;
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
      height: 55px;
      text-align: center;
    }

    &-title {
      color: white;
      font-size: 18px;
    }

    &-footer {
      border: none;
      padding: 0px 41px 35px 41px;

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
        border: 1px solid #4d00b4;
        border-radius: 3px;
        color: #4d00b4;

        &-primary {
          background: #009aff;
          border: 1px solid #009aff;
          color: white;
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
        color: #4d00b4 !important;
        font-size: 14px;
        font-weight: 500;
        line-height: 16px;
      }
    }

    .ant-input-number {
      height: 40px;

      input {
        border: 1px solid #d09cff;
        border-radius: 3px;
        box-sizing: border-box;
        color: #4d00b4;
        font-size: 18px;
        font-weight: 500;
        height: 40px;
        line-height: 21px;
      }
    }

    .ant-form-extra {
      color: #4d00b4;
      font-size: 12px;
      font-style: italic;
      line-height: 14px;
    }

    .agreement-text {
      color: #4d00b4;
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
  background: linear-gradient(164.87deg, #4d00b4 23.35%, #6500b4 62.96%);
  border: 4px solid #d09cff;
  border-radius: 12px;
  box-sizing: border-box;
  color: white;
  padding: 30px 0;
  text-align: center;
  width: 100%;
`;

const AmountBox = styled.div`
  background: white;
  border: 4px solid #d09cff;
  border-radius: 12px;
  box-sizing: border-box;
  color: #4d00b4;
  padding: 23px 30px;
  text-align: center;
  width: 100%;
`;
