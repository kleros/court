import { Card, Col, Row } from 'antd'
import PropTypes from 'prop-types'
import React from 'react'
import { ReactComponent as Underline } from '../assets/images/underline.svg'
import styled from 'styled-components/macro'

const StyledCard = styled(Card)`
  margin: 0 -9.375vw 28px;
`
const StyledTitleCol = styled(Col)`
  font-weight: bold;
`
const StyledUnderline = styled(Underline)`
  bottom: -8px;
  left: 0;
  position: absolute;
`
const TopBanner = ({ description, extra, title }) => (
  <StyledCard>
    <Row align="middle" type="flex">
      <StyledTitleCol offset={2} span={6}>
        {title}
        <StyledUnderline className="primary-fill" />
      </StyledTitleCol>
      <Col span={12}>{description}</Col>
      <Col span={4}>{extra}</Col>
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
