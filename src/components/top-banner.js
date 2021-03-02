import { Card, Col, Row } from 'antd'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components/macro'

const StyledCard = styled(Card)`
  background: linear-gradient(270deg, #f2e3ff 22.92%, #ffffff 76.25%);
  box-shadow: 0px 3px 24px #bc9cff;
  color: #4d00b4;
  margin: 0 -9.375vw 28px -9.375vw;
  min-height: 88px;
  padding: 0px 9.375vw;

  .ant-card-body {
    padding: 24px 0;
  }
`

const StyledDescriptionCol = styled(Col)`
  margin-bottom: 8px;

  @media (max-width: 640px) {
    display: none;
  }
`

const StyledTitleCol = styled(Col)`
  font-size: 24px;
  font-weight: bold;
`
const StyledExtraCol = styled(Col)`
  align-items: center;
  display: flex;
  flex-direction: row;
  grid-gap: 8px 0;

  @media (max-width: 500px) {
    flex-direction: column;
  }
`

const StyledTitleRow = styled(Row)`
  display: flex;

  justify-content: space-between;
  margin: 0;
`

const TopBanner = ({ description, extra, title, extraLong }) => {
  if (extraLong)
    return (
      <StyledCard>
        <StyledTitleRow align="middle" gutter={16} type="flex">
          <StyledTitleCol md={3} offset={1} xs={10}>
            {title}
          </StyledTitleCol>
          <Col md={11} xs={0}>
            {description}
          </Col>
          <StyledExtraCol md={9} xs={11}>
            {extra}
          </StyledExtraCol>
        </StyledTitleRow>
      </StyledCard>
    )

  return (
    <StyledCard>
      <StyledTitleRow type="flex">
        <div style={{ marginRight: '8px' }}>
          <StyledTitleCol>{title}</StyledTitleCol>
          <StyledDescriptionCol>{description}</StyledDescriptionCol>
        </div>
        <StyledExtraCol>{extra}</StyledExtraCol>
      </StyledTitleRow>
    </StyledCard>
  )
}

TopBanner.propTypes = {
  description: PropTypes.node.isRequired,
  extra: PropTypes.node,
  title: PropTypes.string.isRequired
}

TopBanner.defaultProps = {
  extra: null
}

export default TopBanner
