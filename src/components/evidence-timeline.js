import { Col, Icon, Row } from 'antd'
import React from 'react'
import styled from 'styled-components'
import EvidenceCard from './evidence-card'

const StyledHeaderCol = styled(Col)`
  color: #4d00b4;
  font-size: 18px;
  font-weight: 500;
  line-height: 21px;
`
const StyledDividerCol = styled(Col)`
  border-right: 1px solid #4d00b4;
  height: 30px;
`
const EventDiv = styled.div`
  background: #4d00b4;
  border-radius: 300px;
  color: white;
  font-size: 12px;
  font-weight: 500;
  line-height: 14px;
  margin-left: auto;
  margin-right: auto;
  padding: 8px 0;
  text-align: center;
  width: 135px;
`
const ScrollText = styled.div`
  color: #009aff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  line-height: 16px;
  text-align: right;
`
const StyledEvidenceTimelineArea = styled.div`
  padding: 35px 10%;
`

const EvidenceTimeline = ({
  evidence = [],
  metaEvidence = {},
  ruling = null
}) => {
  // Sort so most recent is first
  const sortedEvidence = evidence.sort((a, b) => {
    if (a.submittedAt > b.submittedAt) return -1
    else if (a.submittedAt < b.submittedAt) return 1

    return 0
  })

  if (sortedEvidence.length === 0) return null

  return (
    <StyledEvidenceTimelineArea>
      <Row id="scroll-top">
        <StyledHeaderCol lg={4}>Latest</StyledHeaderCol>
        <Col lg={16}>
          {ruling && (
            <EventDiv style={{ width: '225px' }}>
              {ruling
                ? `Jurors ruled: ${
                    metaEvidence.metaEvidenceJSON.rulingOptions
                      ? metaEvidence.metaEvidenceJSON.rulingOptions.titles[
                          Number(ruling) - 1
                        ]
                      : ruling
                  }`
                : 'Jurors refused to make a ruling'}
            </EventDiv>
          )}
        </Col>
        <ScrollText
          lg={4}
          onClick={() => {
            const _bottomRow = document.getElementById('scroll-bottom')
            _bottomRow.scrollIntoView()
          }}
        >
          Scroll to Bottom <Icon type="arrow-down" />
        </ScrollText>
      </Row>
      {sortedEvidence.map((_evidence, i) => (
        <div key={`evidence-${i}`}>
          <Row>
            <StyledDividerCol lg={12} />
          </Row>
          <EvidenceCard
            evidence={_evidence}
            metaEvidence={metaEvidence.metaEvidenceJSON}
          />
        </div>
      ))}
      <Row>
        <StyledDividerCol lg={12} />
      </Row>
      <Row id="scroll-bottom">
        <StyledHeaderCol lg={4}>Start</StyledHeaderCol>
        <Col lg={16}>
          <EventDiv>Dispute Created</EventDiv>
        </Col>
        <ScrollText
          lg={4}
          onClick={() => {
            const _bottomRow = document.getElementById('scroll-top')
            _bottomRow.scrollIntoView()
          }}
        >
          Scroll to Top <Icon type="arrow-up" />
        </ScrollText>
      </Row>
    </StyledEvidenceTimelineArea>
  )
}

export default EvidenceTimeline
