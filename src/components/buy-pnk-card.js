import { Alert, Button, Card, Form, InputNumber, Spin } from 'antd'
import React, { useCallback } from 'react'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import ETHAmount from './eth-amount'
import styled from 'styled-components/macro'

const StyledCard = styled(Card)`
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
const StyledDiv = styled.div`
  border: 3px solid white;
  border-radius: 3px;
  color: white;
  font-size: 10px;
  margin: 10px 0;
  padding: 10px;
  text-align: center;
`
const StyledPoweredByDiv = styled.div`
  bottom: 8px;
  color: white;
  font-size: 10px;
  opacity: 0.5;
  position: absolute;
  right: 12px;
`
const StyledSpan = styled.span`
  font-size: 24px;
`
export default Form.create()(({ form }) => {
  const { drizzle, useCacheCall, useCacheSend } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    balance: drizzle.web3.utils.toBN(
      drizzleState.accountBalances[drizzleState.accounts[0]]
    )
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
    <StyledCard
      className="secondary-linear-background theme-linear-background"
      hoverable
      title="Buy PNK with ETH"
    >
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
              { message: 'Please enter an amount of PNK.', required: true },
              {
                message: "You can't buy 0 or less PNK.",
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
            <ETHAmount
              amount={
                hideETHSold
                  ? undefined
                  : drizzle.web3.utils.toWei((ETHSold / PNK).toFixed(18))
              }
              decimals={10}
            />{' '}
            ETH
          </StyledDiv>
          <StyledFormItem colon={false} label="ETH">
            <StyledInputNumber
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
        <Button
          disabled={Object.values(errors).some(v => v) || loading}
          htmlType="submit"
          loading={status === 'pending'}
          type="primary"
        >
          Buy Now
        </Button>
      </Form>
      <StyledPoweredByDiv>
        powered by{' '}
        <a href="https://uniswap.io" rel="noopener noreferrer" target="_blank">
          {/* eslint-disable-next-line jsx-a11y/accessible-emoji */}
          <StyledSpan aria-label="Uniswap Logo" role="img">
            🦄
          </StyledSpan>
        </a>
      </StyledPoweredByDiv>
    </StyledCard>
  )
})
