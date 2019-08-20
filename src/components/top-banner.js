import { Card, Col, Row } from 'antd'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components/macro'

const StyledCard = styled(Card)`
  color: #4D00B4;
  margin: 0 -9.375vw 28px;
  padding: 0px 50px 0px 50px;
  background: linear-gradient(270deg, #F2E3FF 22.92%, #FFFFFF 76.25%);
  box-shadow: 0px 3px 24px #BC9CFF;
`
const StyledTitleCol = styled(Col)`
  font-size: 24px;
  font-weight: bold;
`
const StyledExtraCol = styled(Col)`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
`
const TopBanner = ({ description, extra, title }) => (
  <StyledCard>
    <Row align="middle" gutter={16} type="flex">
      <StyledTitleCol md={3} xs={12} offset={1}>
        {title}
      </StyledTitleCol>
      <Col md={14} xs={0}>
        {description}
      </Col>
      <StyledExtraCol md={6} xs={6}>
        {extra}
      </StyledExtraCol>
    </Row>
  </StyledCard>
)

TopBanner.propTypes = {
  description: PropTypes.node.isRequired,
  extra: PropTypes.node,
  title: PropTypes.string.isRequired
}

TopBanner.defaultProps = {
  extra: null
}

export default TopBanner
