import { Card, Col, Row } from 'antd'
import PropTypes from 'prop-types'
import React from 'react'
import { ReactComponent as Underline } from '../assets/images/underline.svg'
import styled from 'styled-components/macro'

const StyledCard = styled(Card)`
  margin: 0 -9.375vw 28px;
  padding: 0px 50px 0px 50px;
`
const StyledTitleCol = styled(Col)`
  font-weight: bold;
`
const StyledUnderline = styled(Underline)`
  bottom: -8px;
  left: 0;
  position: absolute;
`
const StyledExtraCol = styled(Col)`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
`
const TopBanner = ({ description, extra, title }) => (
  <StyledCard>
    <Row align="middle" gutter={16} type="flex">
      <StyledTitleCol md={8} xs={16}>
        {title}
        <StyledUnderline className="primary-fill" />
      </StyledTitleCol>
      <Col md={12} xs={0}>
        {description}
      </Col>
      <StyledExtraCol md={4} xs={8}>
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
