import { Card } from 'antd'
import PropTypes from 'prop-types'
import React from 'react'
import { fluidRange } from 'polished'
import styled from 'styled-components/macro'

const StyledCard = styled(Card)`
  z-index: 1;

  .ant-card-body {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
  }
`
const StyledCardGrid = styled(Card.Grid)`
  align-items: center;
  display: flex;
  flex: 1 1 250px;
  justify-content: center;
  ${fluidRange([
    {
      fromSize: '190px',
      prop: 'height',
      toSize: '320px'
    },
    {
      fromSize: '20px',
      prop: 'paddingRight',
      toSize: '50px'
    },
    {
      fromSize: '20px',
      prop: 'paddingLeft',
      toSize: '50px'
    }
  ])}
  position: relative;
`
const StyledIconCardGrid = styled(StyledCardGrid)`
  background: white;
  border-radius: 12px;
  max-width: 393px;
`
const StyledDiv = styled.div`
  bottom: 25px;
  position: absolute;
`
const StyledTextCardGrid = styled(StyledCardGrid)`
  border-radius: 0 12px 12px 0;
  color: white;
  font-weight: medium;
  margin: 0 0 0 -20px;
  max-width: 413px;
  ${fluidRange({
    fromSize: '24px',
    prop: 'fontSize',
    toSize: '48px'
  })}
  z-index: -1;

  @media (max-width: 649px) {
    border-radius: 0 0 12px 12px;
    height: auto;
    margin: -20px 0 0;
    max-width: 393px;
    padding: calc(10% + 20px) 0 10%;
  }
`
const WelcomeCard = ({ icon, text, version }) => (
  <StyledCard bordered={false}>
    <StyledIconCardGrid>
      {icon}
      <StyledDiv>{version}</StyledDiv>
    </StyledIconCardGrid>
    <StyledTextCardGrid className="secondary-linear-background theme-linear-background">
      {text}
    </StyledTextCardGrid>
  </StyledCard>
)

WelcomeCard.propTypes = {
  icon: PropTypes.node.isRequired,
  text: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired
}

export default WelcomeCard
