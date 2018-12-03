import { Card } from 'antd'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components/macro'

const StyledCard = styled(Card)`
  align-items: center;
  display: flex;
  justify-content: center;
  z-index: 1;
`
const StyledCardGrid = styled(Card.Grid)`
  align-items: center;
  display: flex;
  height: 325px;
  justify-content: center;
  position: relative;
`
const StyledIconCardGrid = styled(StyledCardGrid)`
  background: white;
  border-radius: 12px;
  width: 393px;
`
const StyledDiv = styled.div`
  bottom: 25px;
  position: absolute;
`
const StyledTextCardGrid = styled(StyledCardGrid)`
  border-radius: 0 12px 12px 0;
  color: white;
  font-size: 48px;
  font-weight: medium;
  margin-left: -20px;
  width: 413px;
  z-index: -1;
`
const WelcomeCard = ({ icon, text, version }) => (
  <StyledCard bordered={false} className="secondary">
    <StyledIconCardGrid>
      {icon}
      <StyledDiv>{version}</StyledDiv>
    </StyledIconCardGrid>
    <StyledTextCardGrid className="theme-linear-background">
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
