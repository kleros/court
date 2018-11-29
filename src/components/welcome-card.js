import { Card } from 'antd'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components/macro'

const StyledCardGrid = styled(Card.Grid)`
  align-items: center;
  display: flex;
  height: 325px;
  justify-content: center;
`
const StyledIconCardGrid = styled(StyledCardGrid)`
  border-radius: 12px;
  width: 393px;
`
const StyledTextCardGrid = styled(StyledCardGrid)`
  border-radius: 0 12px 12px 0;
  width: 413px;
`
const WelcomeCard = ({ icon, text, version }) => (
  <Card>
    <StyledIconCardGrid>
      {icon}
      {version}
    </StyledIconCardGrid>
    <StyledTextCardGrid>{text}</StyledTextCardGrid>
  </Card>
)

WelcomeCard.propTypes = {
  icon: PropTypes.node.isRequired,
  text: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired
}

export default WelcomeCard
