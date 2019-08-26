import { Row, Col } from 'antd'
import React from 'react'
import { Link, withRouter } from 'react-router-dom'
import styled from 'styled-components'

const StyledCaseSummary = styled.div`
  display: inline-block;
  background: white;
  border-radius: 12px;
  width: 95%;
`

const CaseNumber = styled.div`
  color: #4D00B4;
  font-weight: 500;
  font-size: 14px;
  line-height: 16px;
`
const CaseStatus = styled.div`
  float: right;
  font-weight: 500;
  font-size: 14px;
  line-height: 16px;
`
const CaseSummaryBody = styled.div`
  box-shadow: 0px 6px 36px #BC9CFF;
  border-radius: 12px;
  padding: 13px 21px;
`
const CaseSummaryText = styled.div`
  margin: 26px 0px;
  font-weight: 500;
  font-size: 20px;
  line-height: 23px;
  color: black;
`

const CaseSummaryCard = ({ dispute }) => {
  return (
    <Link to={`/cases/${dispute.ID}`}>
      <StyledCaseSummary>
        <CaseSummaryBody>
          <Row>
            <Col lg={16}>
              <CaseNumber>
                {`Case #${dispute.ID}`}
              </CaseNumber>
            </Col>
            <Col lg={8}>
              <CaseStatus>
                {dispute.statusDiv}
              </CaseStatus>
            </Col>
          </Row>
          <CaseSummaryText>
            {dispute.metaEvidenceJSON ? dispute.metaEvidenceJSON.title : ''}
          </CaseSummaryText>
        </CaseSummaryBody>
      </StyledCaseSummary>
    </Link>
  )
}

export default withRouter(CaseSummaryCard)
