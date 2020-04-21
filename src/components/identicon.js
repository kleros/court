import { List, Popover, Spin } from 'antd'
import { drizzleReactHooks } from '@drizzle/react-plugin'
import ETHAddress from './eth-address'
import ETHAmount from './eth-amount'
import PropTypes from 'prop-types'
import React from 'react'
import ReactBlockies from 'react-blockies'
import styled from 'styled-components/macro'
import { VIEW_ONLY_ADDRESS } from '../bootstrap/dataloader'

const { useDrizzle, useDrizzleState } = drizzleReactHooks

const StyledDiv = styled.div`
  height: 32px;
  line-height: 100%;
  width: 32px;
`
const StyledReactBlockies = styled(ReactBlockies)`
  border-radius: ${({ large }) => (large ? '4' : '16')}px;
`
const Identicon = ({ account, className, large, pinakion }) => {
  const { useCacheCall } = useDrizzle()
  const drizzleState = account
    ? { account }
    : useDrizzleState(drizzleState => ({
        account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
        balance: drizzleState.accountBalances[drizzleState.accounts[0] || VIEW_ONLY_ADDRESS]
      }))
  let PNK
  if (pinakion)
    PNK = useCacheCall('MiniMeTokenERC20', 'balanceOf', drizzleState.account)
  const content = (
    <StyledDiv className={className}>
      <StyledReactBlockies
        large={large}
        scale={large ? 7 : 4}
        seed={drizzleState.account.toLowerCase()}
        size={large ? 14 : 8}
      />
    </StyledDiv>
  )
  return large ? (
    content
  ) : (
    <Popover
      arrowPointAtCenter
      content={
        <List>
          <List.Item>
            <List.Item.Meta
              description={<ETHAddress address={drizzleState.account} />}
              title="Address"
            />
          </List.Item>
          {!account && (
            <List.Item>
              <List.Item.Meta
                description={
                  <ETHAmount amount={drizzleState.balance} decimals={4} />
                }
                title="ETH"
              />
            </List.Item>
          )}
          {pinakion && (
            <Spin spinning={!PNK}>
              <List.Item>
                <List.Item.Meta
                  description={<ETHAmount amount={PNK} />}
                  title="PNK"
                />
              </List.Item>
            </Spin>
          )}
        </List>
      }
      placement="bottomRight"
      title="Account"
      trigger="click"
    >
      {content}
    </Popover>
  )
}

Identicon.propTypes = {
  account: PropTypes.string,
  className: PropTypes.string,
  large: PropTypes.bool,
  pinakion: PropTypes.bool
}

Identicon.defaultProps = {
  account: null,
  className: null,
  large: false,
  pinakion: false
}

export default Identicon
