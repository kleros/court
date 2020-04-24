import { Alert, Button, Card, Form, InputNumber, Spin, Tooltip } from 'antd'
import React, { useCallback } from 'react'
import { drizzleReactHooks } from '@drizzle/react-plugin'
import ETHAmount from './eth-amount'
import styled from 'styled-components/macro'
import { VIEW_ONLY_ADDRESS } from '../bootstrap/dataloader'

const { useDrizzle, useDrizzleState } = drizzleReactHooks

const StyledCard = styled(Card)`
  background: linear-gradient(180deg, #4d00b4 0%, #6500b4 100%);
  border-radius: 12px;
  box-shadow: 0px 6px 36px #bc9cff;
  cursor: initial;
  position: relative;

  .ant-card {
    &-head {
      color: white;
      margin: 0 33px;
      text-align: center;
    }

    &-body {
      padding: 10px 36px 21px;
    }
  }

  @media (max-width: 500px) {
    margin-bottom: 20px;
  }
`
const StyledFormItem = styled(Form.Item)`
  .ant-form-item-label label {
    color: white;
  }
`
const StyledInputNumber = styled(InputNumber)`
  background: rgba(255, 255, 255, 0.3);
  border: none;
  color: white;
  width: 100%;
`
const StyledInputNumberRight = styled(StyledInputNumber)`
  input {
    text-align: right;
  }
`
const StyledDiv = styled.div`
  border: 3px solid white;
  border-radius: 3px;
  color: white;
  font-size: 14px;
  margin: 10px 0;
  padding: 10px;
  text-align: center;
`
const StyledPoweredByDiv = styled.div`
  margin-top: 25px;
  width: 100%;

  a {
    color: white;
    float: right;
    font-size: 12px;
    text-decoration: none;
  }
`
const StyledButton = styled(Button)`
  border-radius: 3px;
  width: 100%;
`

export default Form.create()(({ form }) => {
  const { drizzle, useCacheCall, useCacheSend } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    balance: drizzle.web3.utils.toBN(
      drizzleState.accounts[0]
        ? drizzleState.accountBalances[drizzleState.accounts[0]]
        : 0
    ),
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS
  }))
  const _exchangeBalance = useCacheCall(
    'MiniMeTokenERC20',
    'balanceOf',
    drizzle.contracts.UniswapExchange.address
  )
  const exchangeBalance =
    _exchangeBalance && drizzle.web3.utils.toBN(_exchangeBalance)
  const errors = form.getFieldsError()
  let PNK = form.getFieldValue('PNK')
  let hideETHSold = false
  if (
    PNK === undefined ||
    PNK === '' ||
    PNK === '-' ||
    !exchangeBalance ||
    (errors.PNK &&
      (errors.PNK.includes("You can't buy 0 or less PNK.") ||
        errors.PNK.includes('Not enough liquidity.')))
  )
    hideETHSold = true
  else
    PNK = drizzle.web3.utils.toBN(
      drizzle.web3.utils.toWei(typeof PNK === 'string' ? PNK : String(PNK))
    )
  const _ETHSold = useCacheCall(
    'UniswapExchange',
    'getEthToTokenOutputPrice',
    hideETHSold ? '1' : String(PNK)
  )
  const ETHSold = _ETHSold && drizzle.web3.utils.toBN(_ETHSold)
  const loading = !exchangeBalance || !ETHSold
  hideETHSold = hideETHSold || loading
  const { send, status } = useCacheSend(
    'UniswapExchange',
    'ethToTokenSwapOutput'
  )
  return (
    <StyledCard bordered={false} hoverable title="Buy PNK with ETH">
      {status && status !== 'pending' && (
        <Alert
          closable
          message={
            status === 'success' ? 'Purchase completed.' : 'Error in purchase.'
          }
          type={status}
        />
      )}
      <Form
        onSubmit={useCallback(
          e => {
            e.preventDefault()
            form.validateFieldsAndScroll((err, values) => {
              if (!err && !hideETHSold)
                send(
                  drizzle.web3.utils.toWei(
                    typeof values.PNK === 'string'
                      ? values.PNK
                      : String(values.PNK)
                  ),
                  Math.floor(Date.now() / 1000) + 3600,
                  { value: ETHSold }
                )
            })
          },
          [form.validateFieldsAndScroll, hideETHSold, ETHSold]
        )}
      >
        <StyledFormItem colon={false} hasFeedback label="PNK">
          {form.getFieldDecorator('PNK', {
            rules: [
              {
                message: "You can't buy 0 or less PNK.",
                validator: (_, _value, callback) => {
                  if (_value === undefined || _value === '' || _value === '-')
                    return callback(true)
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
                  callback(
                    value.gt(drizzle.web3.utils.toBN(0)) ? undefined : true
                  )
                }
              },
              {
                message: "You don't have enough ETH.",
                validator: (_, _value, callback) => {
                  if (_value === undefined || _value === '' || _value === '-')
                    return callback()
                  callback(
                    !ETHSold || ETHSold.lte(drizzleState.balance)
                      ? undefined
                      : true
                  )
                }
              },
              {
                message: 'Not enough liquidity.',
                validator: (_, _value, callback) => {
                  if (_value === undefined || _value === '' || _value === '-')
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
                  callback(
                    !exchangeBalance || value.lte(exchangeBalance)
                      ? undefined
                      : true
                  )
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
        </StyledFormItem>
        <Spin spinning={loading}>
          <StyledDiv>
            1 PNK ~={' '}
            {hideETHSold ? (
              ' ... '
            ) : (
                <ETHAmount
                  amount={drizzle.web3.utils.toWei((ETHSold / PNK).toFixed(18))}
                  decimals={10}
                />
              )}{' '}
            ETH
          </StyledDiv>
          <StyledFormItem colon={false} label="ETH">
            <StyledInputNumberRight
              disabled
              precision={18}
              value={
                hideETHSold
                  ? undefined
                  : drizzle.web3.utils.fromWei(String(ETHSold))
              }
            />
          </StyledFormItem>
        </Spin>
        <Tooltip title={
          drizzleState.account === VIEW_ONLY_ADDRESS && 'A Web3 wallet is required.'
        }>
          <StyledButton
            disabled={Object.values(errors).some(v => v) || loading || drizzleState.account === VIEW_ONLY_ADDRESS}
            htmlType="submit"
            loading={status === 'pending'}
            type="primary"
          >
            Buy
          </StyledButton>
        </Tooltip>
      </Form>
      <StyledPoweredByDiv>
        <a href="https://uniswap.io" rel="noopener noreferrer" target="_blank">
          Powered by Uniswap
        </a>
      </StyledPoweredByDiv>
    </StyledCard>
  )
})
