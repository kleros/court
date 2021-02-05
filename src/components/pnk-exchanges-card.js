import { ReactComponent as Bitfinex } from '../assets/images/bitfinex.svg'
import { ReactComponent as Ethfinex } from '../assets/images/ethfinex.svg'
import { ReactComponent as Idex } from '../assets/images/idex.svg'
import { ReactComponent as UniswapNinja } from '../assets/images/uniswap-ninja.svg'
import React from 'react'
import styled from 'styled-components/macro'

const StyledExchangeCard = styled.a`
  align-items: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0px 6px 36px #bc9cff;
  display: flex;
  height: 40px;
  padding: 40px 26px;

  svg {
    vertical-align: middle;
    width: 80%;
  }
`

const StyledExchangeSection = styled.div`
  display: grid;
  grid-gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(225px, 1fr));
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
  <StyledExchangeSection>
    {Exchanges.map((exchange, i) => (
      <StyledExchangeCard href={exchange.link}>
        {exchange.logo}
      </StyledExchangeCard>
    ))}
  </StyledExchangeSection>
)
