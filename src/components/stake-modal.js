import {
  Alert,
  Checkbox,
  Col,
  Form,
  InputNumber,
  Modal,
  Row,
  Skeleton
} from 'antd'
import React, { useCallback, useMemo } from 'react'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import ETHAmount from './eth-amount'
import PropTypes from 'prop-types'
import styled from 'styled-components/macro'
import { useDataloader } from '../bootstrap/dataloader'
import infoImg from '../assets/images/info.png'

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
`
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
`
const StyledAmountDiv = styled.div`
  color: inherit;
  font-size: 18px;
  font-weight: bold;
`
const StyledValidatorAmountSpan = styled.span`
  font-style: italic;
  font-weight: bold;
`
const StyledInputNumber = styled(InputNumber)`
  width: 100%;
`
const StyledRow = styled(Row)`
  margin-bottom: 15px;
`

const AvailableStake = styled.div`
  background: linear-gradient(164.87deg, #4d00b4 23.35%, #6500b4 62.96%);
  border: 4px solid #d09cff;
  border-radius: 12px;
  box-sizing: border-box;
  color: white;
  padding: 30px 0;
  text-align: center;
  width: 100%;
`
const AmountBox = styled.div`
  background: white;
  border: 4px solid #d09cff;
  border-radius: 12px;
  box-sizing: border-box;
  color: #4d00b4;
  padding: 23px 30px;
  text-align: center;
  width: 100%;
`

const StakeModal = Form.create()(({ ID, form, onCancel }) => {
  const { drizzle, useCacheCall, useCacheSend } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0]
  }))
  const loadPolicy = useDataloader.loadPolicy()
  let name
  const policy = useCacheCall('PolicyRegistry', 'policies', ID)
  if (policy !== undefined) {
    const policyJSON = loadPolicy(policy)
    if (policyJSON) name = policyJSON.name
  }
  const _balance = useCacheCall(
    'MiniMeTokenERC20',
    'balanceOf',
    drizzleState.account
  )
  const balance = _balance && drizzle.web3.utils.toBN(_balance)
  const juror = useCacheCall(
    'KlerosLiquidExtraViews',
    'getJuror',
    drizzleState.account
  )
  const stakedTokens = juror && drizzle.web3.utils.toBN(juror.stakedTokens)
  const _stake = useCacheCall(
    'KlerosLiquidExtraViews',
    'stakeOf',
    drizzleState.account,
    ID
  )
  const stake = _stake && drizzle.web3.utils.toBN(_stake)
  const subcourt = useCacheCall('KlerosLiquid', 'courts', ID)
  const minStake = subcourt && drizzle.web3.utils.toBN(subcourt.minStake)
  const min = stake && minStake && minStake.sub(stake)
  const max = balance && stakedTokens && balance.sub(stakedTokens)
  const loading = !min || !max
  const { send, status } = useCacheSend('KlerosLiquid', 'setStake')
  const hasError = Object.values(form.getFieldsError()).some(v => v)
  return (
    <StyledModal
      cancelText="Back"
      centered
      closable={false}
      confirmLoading={loading || status === 'pending'}
      maskClosable
      okButtonProps={useMemo(
        () => ({
          disabled: hasError,
          htmlType: 'submit'
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
                String(
                  stake.add(
                    drizzle.web3.utils.toBN(
                      drizzle.web3.utils.toWei(
                        typeof values.PNK === 'string'
                          ? values.PNK
                          : String(values.PNK)
                      )
                    )
                  )
                )
              )
          }),
        [form.validateFieldsAndScroll, ID, stake]
      )}
      title={`Stake PNK in ${name || '-'}`}
      visible
      width="480px"
    >
      <StyledRow>
        <AvailableStake>
          <div>Available to Stake</div>
          <StyledAmountDiv style={{ marginBottom: '10px' }}>
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
                  <div style={{ marginTop: '5px' }}>
                    <img src={infoImg} style={{ marginRight: '5px' }} />
                    Enter a negative value to unstake.
                  </div>
                }
                hasFeedback
                label="PNK"
              >
                {form.getFieldDecorator('PNK', {
                  initialValue: drizzle.web3.utils.fromWei(String(max)),
                  rules: [
                    {
                      message:
                        'Your new court stake must be higher than the min stake.',
                      validator: (_, _value, callback) => {
                        if (
                          _value === undefined ||
                          _value === '' ||
                          _value === '-'
                        )
                          return callback()
                        const value = drizzle.web3.utils.toBN(
                          drizzle.web3.utils.toWei(
                            typeof _value === 'number'
                              ? _value.toLocaleString('fullwide', {
                                  useGrouping: false
                                })
                              : typeof _value === 'string'
                              ? _value
                              : String(_value)
                          )
                        )
                        callback(value.gte(min) ? undefined : true)
                      }
                    },
                    {
                      message: (
                        <>
                          You only have{' '}
                          <StyledValidatorAmountSpan>
                            <ETHAmount amount={max} /> PNK
                          </StyledValidatorAmountSpan>{' '}
                          available to stake.
                        </>
                      ),
                      validator: (_, _value, callback) => {
                        if (
                          _value === undefined ||
                          _value === '' ||
                          _value === '-'
                        )
                          return callback()
                        const value = drizzle.web3.utils.toBN(
                          drizzle.web3.utils.toWei(
                            typeof _value === 'number'
                              ? _value.toLocaleString('fullwide', {
                                  useGrouping: false
                                })
                              : typeof _value === 'string'
                              ? _value
                              : String(_value)
                          )
                        )
                        callback(value.lte(max) ? undefined : true)
                      }
                    }
                  ]
                })(
                  <StyledInputNumber
                    parser={useCallback(s => {
                      s = s.replace(/(?!^-|\.)\D|\.(?![^.]*$)/g, '')
                      const index = s.indexOf('.')
                      return index === -1
                        ? s
                        : `${s.slice(0, index)}${s.slice(index, index + 19)}`
                    }, [])}
                    precision={0}
                  />
                )}
              </Form.Item>
              <Form.Item colon={false}>
                {form.getFieldDecorator('Agreement', {
                  rules: [
                    {
                      message: 'Please acknowledge risks before you continue',
                      validator: (_, _value, callback) => {
                        callback(_value ? undefined : true)
                      }
                    }
                  ]
                })(
                  <Row>
                    <Col className="agreement-checkbox" lg={1}>
                      <Checkbox />
                    </Col>
                    <Col className="agreement-text" lg={23}>
                      I understand how Kleros works and that I may suffer a
                      financial loss by participating as a juror in the
                      platform.
                    </Col>
                  </Row>
                )}
              </Form.Item>
            </>
          )}
        </Skeleton>
        {status && status !== 'pending' && (
          <Alert
            closable
            message={
              status === 'success' ? 'Stake set.' : 'Failed to set stake.'
            }
            type={status}
          />
        )}
      </StyledForm>
    </StyledModal>
  )
})

StakeModal.propTypes = {
  ID: PropTypes.string.isRequired,
  onCancel: PropTypes.func.isRequired
}

export default StakeModal
