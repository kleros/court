import { List, Popover, Spin } from 'antd'
import PropTypes from 'prop-types'
import React from 'react'
import ReactBlockies from 'react-blockies'
import styled from 'styled-components/macro'
import { useDrizzle } from '../temp/drizzle-react-hooks'

const StyledDiv = styled.div`
  line-height: 100%;
`
const StyledReactBlockies = styled(ReactBlockies)`
  border-radius: ${({ large }) => (large ? '4' : '16')}px;
`
const Identicon = ({ large, pinakion }) => {
  const { cacheCall, drizzle, drizzleState } = useDrizzle()
  let PNK
  if (pinakion)
    PNK = cacheCall('MiniMeTokenERC20', 'balanceOf', drizzleState.accounts[0])
  const content = (
    <StyledDiv>
      <StyledReactBlockies
        large={large}
        scale={large ? 7 : 4}
        seed={drizzleState.accounts[0].toLowerCase()}
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
              description={`${drizzleState.accounts[0].slice(
                0,
                6
              )}...${drizzleState.accounts[0].slice(
                drizzleState.accounts[0].length - 4
              )}`}
              title="Address"
            />
          </List.Item>
          <List.Item>
            <List.Item.Meta
              description={Number(
                drizzle.web3.utils.fromWei(
                  drizzleState.accountBalances[drizzleState.accounts[0]]
                )
              ).toFixed(4)}
              title="ETH"
            />
          </List.Item>
          {pinakion && (
            <Spin
              spinning={
                !drizzleState.contracts.MiniMeTokenERC20.synced ||
                PNK === undefined
              }
            >
              <List.Item>
                <List.Item.Meta
                  description={
                    PNK
                      ? Number(drizzle.web3.utils.fromWei(PNK)).toFixed(4)
                      : '...'
                  }
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
