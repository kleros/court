import { Col, Row } from 'antd'
import React from 'react'
import { Link, withRouter } from 'react-router-dom'
import styled from 'styled-components'

const StyledCaseSummary = styled.div`
  background: white;
  border-radius: 12px;
  display: inline-block;
  width: 95%;
`

const CaseNumber = styled.div`
  color: #4d00b4;
  font-size: 14px;
  font-weight: 500;
  line-height: 16px;
`
const CaseStatus = styled.div`
  float: right;
  font-size: 14px;
  font-weight: 500;
  line-height: 16px;
`
const CaseSummaryBody = styled.div`
  border-radius: 12px;
  box-shadow: 0px 6px 36px #bc9cff;
  padding: 13px 21px;
`
const CaseSummaryText = styled.div`
  color: black;
  font-size: 20px;
  font-weight: 500;
  line-height: 23px;
  margin: 26px 0px;
`

const CaseSummaryCard = ({ dispute }) => (
  <Link to={`/cases/${dispute.ID}`}>
    <StyledCaseSummary>
      <CaseSummaryBody>
        <Row>
          <Col lg={16}>
            <CaseNumber>{`Case #${dispute.ID}`}</CaseNumber>
          </Col>
          <Col lg={8}>
            <CaseStatus>{dispute.statusDiv}</CaseStatus>
          </Col>
        </Row>
        <CaseSummaryText>
          {dispute.metaEvidenceJSON ? dispute.metaEvidenceJSON.title : ''}
        </CaseSummaryText>
      </CaseSummaryBody>
    </StyledCaseSummary>
  </Link>
)

export default withRouter(CaseSummaryCard)
