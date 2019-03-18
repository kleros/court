import { Alert, Col, Form, InputNumber, Modal, Row, Skeleton } from 'antd'
import React, { useCallback, useMemo } from 'react'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import ETHAmount from './eth-amount'
import PropTypes from 'prop-types'
import { fluidRange } from 'polished'
import styled from 'styled-components/macro'
import { useDataloader } from '../bootstrap/dataloader'

const StyledModal = styled(Modal)`
  max-width: 90%;

  .ant-modal {
    &-content {
      padding: 0 21px;
    }

    &-header {
      text-align: center;
    }

    &-footer {
      border: none;

      div {
        display: flex;
        justify-content: space-between;
      }
    }
  }
`
const StyledDiv = styled.div`
  align-items: center;
  border: 4px solid lightgrey;
  border-radius: 3px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-bottom: 24px;
  ${fluidRange([
    {
      fromSize: '7px',
      prop: 'fontSize',
      toSize: '14px'
    },
    {
      fromSize: '50px',
      prop: 'height',
      toSize: '100px'
    },
    {
      fromSize: '60px',
      prop: 'width',
      toSize: '120px'
    }
  ])}
  position: relative;
`
const StyledAmountDiv = styled.div`
  font-weight: bold;
  ${fluidRange({
    fromSize: '7px',
    prop: 'fontSize',
    toSize: '14px'
  })}
`
const StyledOperatorDiv = styled.div`
  font-size: 18px;
  left: -12px;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
`
const StyledValidatorAmountSpan = styled.span`
  font-style: italic;
  font-weight: bold;
`
const StyledInputNumber = styled(InputNumber)`
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
      cancelText="Return"
      centered
      closable={false}
      confirmLoading={loading || status === 'pending'}
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
      <Row gutter={24}>
        <Col span={8}>
          <StyledDiv>
            Wallet Balance
            <StyledAmountDiv>
              <ETHAmount amount={balance} /> PNK
            </StyledAmountDiv>
          </StyledDiv>
        </Col>
        <Col span={8}>
          <StyledDiv>
            Total Staked
            <StyledAmountDiv>
              <ETHAmount amount={stakedTokens} /> PNK
            </StyledAmountDiv>
            <StyledOperatorDiv className="primary-color theme-color">
              -
            </StyledOperatorDiv>
          </StyledDiv>
        </Col>
        <Col span={8}>
          <StyledDiv>
            Stakeable
            <StyledAmountDiv className="primary-color theme-color">
              <ETHAmount amount={max} /> PNK
            </StyledAmountDiv>
            <StyledOperatorDiv className="primary-color theme-color">
              =
            </StyledOperatorDiv>
          </StyledDiv>
        </Col>
      </Row>
      <Row gutter={24}>
        <Col span={8}>
          <StyledDiv>
            Court Stake
            <StyledAmountDiv>
              <ETHAmount amount={stake} /> PNK
            </StyledAmountDiv>
          </StyledDiv>
        </Col>
        <Col span={8}>
          <StyledDiv>
            Min Stake
            <StyledAmountDiv>
              <ETHAmount amount={minStake} /> PNK
            </StyledAmountDiv>
            <StyledOperatorDiv className="primary-color theme-color">
              -
            </StyledOperatorDiv>
          </StyledDiv>
        </Col>
        <Col span={8}>
          <StyledDiv>
            Unstakeable
            <StyledAmountDiv className="primary-color theme-color">
              <ETHAmount amount={min && min.neg()} /> PNK
            </StyledAmountDiv>
            <StyledOperatorDiv className="primary-color theme-color">
              =
            </StyledOperatorDiv>
          </StyledDiv>
        </Col>
      </Row>
      <Form>
        <Skeleton active loading={loading}>
          {!loading && (
            <Form.Item
              colon={false}
              extra="Enter a negative value to unstake."
              hasFeedback
              label="PNK"
            >
              {form.getFieldDecorator('PNK', {
                initialValue: drizzle.web3.utils.fromWei(String(max)),
                rules: [
                  { message: 'Please enter an amount of PNK.', required: true },
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
                />
              )}
            </Form.Item>
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
      </Form>
    </StyledModal>
  )
})

StakeModal.propTypes = {
  ID: PropTypes.string.isRequired,
  onCancel: PropTypes.func.isRequired
}

export default StakeModal
