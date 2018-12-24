import { List, Popover, Spin } from 'antd'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import ETHAddress from './eth-address'
import ETHAmount from './eth-amount'
import PropTypes from 'prop-types'
import React from 'react'
import ReactBlockies from 'react-blockies'
import styled from 'styled-components/macro'

const StyledDiv = styled.div`
  line-height: 100%;
`
const StyledReactBlockies = styled(ReactBlockies)`
  border-radius: ${({ large }) => (large ? '4' : '16')}px;
`
const Identicon = ({ large, pinakion }) => {
  const { useCacheCall } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0],
    balance: drizzleState.accountBalances[drizzleState.accounts[0]]
  }))
  let PNK
  if (pinakion)
    PNK = useCacheCall('MiniMeTokenERC20', 'balanceOf', drizzleState.account)
  const content = (
    <StyledDiv>
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
          <List.Item>
            <List.Item.Meta
              description={
                <ETHAmount amount={drizzleState.balance} decimals={4} />
              }
              title="ETH"
            />
          </List.Item>
          {pinakion && (
            <Spin spinning={PNK === undefined}>
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
      title="Your Account"
      trigger="click"
    >
      {content}
    </Popover>
  )
}

Identicon.propTypes = {
  large: PropTypes.bool,
  pinakion: PropTypes.bool
}

Identicon.defaultProps = {
  large: false,
  pinakion: false
}

export default Identicon
