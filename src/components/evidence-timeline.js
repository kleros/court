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
  width: 50%;
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
  padding: 10px 12px;
  text-align: center;
  width: fit-content;
`
const ScrollText = styled.div`
  color: #009aff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  line-height: 16px;
  text-align: right;

  @media (max-width: 500px) {
    text-align: center;
  }
`
const StyledEvidenceTimelineArea = styled.div`
  padding: 35px 10%;
`

const EvidenceTimeline = ({
  evidence = [],
  metaEvidence = {},
  ruling = null,
  chainId = 1
}) => {
  // Sort so most recent is first
  const sortedEvidence = evidence.sort((a, b) => {
    if (a.submittedAt > b.submittedAt) return -1
    else if (a.submittedAt < b.submittedAt) return 1

    return 0;
  });

  if (sortedEvidence.length === 0) return null

  return (
    <StyledEvidenceTimelineArea>
      <Row id="scroll-top">
        <StyledHeaderCol lg={4}>Último</StyledHeaderCol>
        <Col lg={16}>
          {ruling && (
            <EventDiv>
              {ruling
                ? `El jurado votó: ${
                    metaEvidence.metaEvidenceJSON.rulingOptions
                      ? metaEvidence.metaEvidenceJSON.rulingOptions.titles[
                          Number(ruling) - 1
                        ]
                      : ruling
                  }`
                : 'El juradó rechazó responder.'}
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
          Ir al final <Icon type="arrow-down" />
        </ScrollText>
      </Row>
      {sortedEvidence.map((_evidence, i) => (
        <div key={`evidence-${i}`}>
          <Row>
            <StyledDividerCol lg={12} />
          </Row>
          <EvidenceCard evidence={_evidence} metaEvidence={metaEvidence.metaEvidenceJSON} chainId={chainId} />
        </div>
      ))}
      <Row>
        <StyledDividerCol lg={12} />
      </Row>
      <Row id="scroll-bottom">
        <StyledHeaderCol lg={4} />
        <Col lg={16}>
          <EventDiv>Disputa creada</EventDiv>
        </Col>
        <ScrollText
          lg={4}
          onClick={() => {
            const _bottomRow = document.getElementById('scroll-top')
            _bottomRow.scrollIntoView()
          }}
        >
          Ir arriba <Icon type="arrow-up" />
        </ScrollText>
      </Row>
    </StyledEvidenceTimelineArea>
  )
}

export default EvidenceTimeline
