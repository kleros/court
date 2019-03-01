import { Card, Divider } from 'antd'
import { ReactComponent as Bitfinex } from '../assets/images/bitfinex.svg'
import { ReactComponent as Ethfinex } from '../assets/images/ethfinex.svg'
import { ReactComponent as Idex } from '../assets/images/idex.svg'
import React from 'react'
import styled from 'styled-components/macro'

const StyledCard = styled(Card)`
  cursor: initial;
`
const StyledBitfinex = styled(Bitfinex)`
  height: 55px;
  padding: 0 20px;
  width: 100%;
`
const StyledEthfinex = styled(Ethfinex)`
  height: 55px;
  width: 100%;
`
const StyledIdex = styled(Idex)`
  height: 55px;
  margin-left: -15px;
  width: 100%;
`
export default () => (
  <StyledCard hoverable title="Exchanges">
    <a
      href="https://www.bitfinex.com"
      rel="noopener noreferrer"
      target="_blank"
    >
      <StyledBitfinex />
    </a>
    <Divider />
    <a
      href="https://www.ethfinex.com"
      rel="noopener noreferrer"
      target="_blank"
    >
      <StyledEthfinex />
    </a>
    <Divider />
    <a
      href="https://idex.market/eth/pnk"
      rel="noopener noreferrer"
      target="_blank"
    >
      <StyledIdex />
    </a>
  </StyledCard>
)
