import { Col } from 'antd'
import { ReactComponent as Bitfinex } from '../assets/images/bitfinex.svg'
import { ReactComponent as Ethfinex } from '../assets/images/ethfinex.svg'
import { ReactComponent as Idex } from '../assets/images/idex.svg'
import { ReactComponent as UniswapNinja } from '../assets/images/uniswap-ninja.svg'
import React from 'react'
import styled from 'styled-components/macro'

const StyledCol = styled(Col)`
  margin-bottom: 50px;
  max-height: 100px;
`

const StyledExchangeCard = styled.a`
  background: white;
  border-radius: 12px;
  box-shadow: 0px 6px 36px #bc9cff;
  height: 100px;
  padding: 40px 26px;
  width: 90%;

  svg {
    vertical-align: middle;
    width: 80%;
  }
`

const Exchanges = [
  {
    logo: <Bitfinex />,
    link: 'https://www.bitfinex.com'
  },
  {
    logo: <Ethfinex />,
    link: 'https://www.ethfinex.com'
  },
  {
    logo: <Idex />,
    link: 'https://idex.market/eth/pnk'
  },
  {
    logo: <UniswapNinja />,
    link: 'https://uniswap.ninja'
  }
]
export default () => (
  <>
    {Exchanges.map((exchange, i) => (
      <StyledCol lg={8}>
        <StyledExchangeCard href={exchange.link}>
          {exchange.logo}
        </StyledExchangeCard>
      </StyledCol>
    ))}
  </>
)
