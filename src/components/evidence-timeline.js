import { Row, Col, Icon } from 'antd'
import React from 'react'
import styled from 'styled-components'

import EvidenceCard from './evidence-card'

const StyledHeaderCol = styled(Col)`
  font-weight: 500;
  font-size: 18px;
  line-height: 21px;
  color: #4D00B4;
`
const StyledDividerCol = styled(Col)`
  height: 30px;
  border-right: 1px solid #4D00B4;
`
const EventDiv = styled.div`
  margin-left: auto;
  margin-right: auto;
  width: 135px;
  background: #4D00B4;
  border-radius: 300px;
  color: white;
  font-weight: 500;
  font-size: 12px;
  line-height: 14px;
  text-align: center;
  text-align: center;
  padding: 8px 0;
`
const ScrollText = styled.div`
  color: #009AFF;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  line-height: 16px;
  text-align: right;
`

const EvidenceTimeline = ({evidence = {}, metaEvidence = {}, vents = [], ruling = null}) => {
  // Sort so most recent is first
  const sortedEvidence = evidence.sort((a, b) => {
    if (a.submittedAt > b.submittedAt) return -1
    else if (a.submittedAt < b.submittedAt) return 1

    return 0
  })

  if (sortedEvidence.length === 0) return null

  return (
    <>
      <Row id="scroll-top">
        <StyledHeaderCol lg={4}>Latest</StyledHeaderCol>
        <Col lg={16}>
        {
          ruling && (
              <EventDiv>
                {
                  ruling ?
                    `Jurors ruled: ${ruling}` :
                    "Jurors refused to make a ruling"
                }
              </EventDiv>
          )
        }
        </Col>
        <ScrollText lg={4} onClick={() => {
            const _bottomRow = document.getElementById("scroll-bottom")
            _bottomRow.scrollIntoView()
          }}>
          Scroll to Bottom <Icon type="arrow-down" />
        </ScrollText>
      </Row>
      {
        sortedEvidence.map((_evidence, i) => {
          return (
            <div key={`evidence-${i}`}>
              <Row><StyledDividerCol lg={12} /></Row>
              <EvidenceCard evidence={_evidence}  />
            </div>
          )
        })
      }
      <Row><StyledDividerCol lg={12} /></Row>
      <Row id="scroll-bottom">
        <StyledHeaderCol lg={4}>Start</StyledHeaderCol>
        <Col lg={16}>
          <EventDiv>
            Dispute Created
          </EventDiv>
        </Col>
        <ScrollText lg={4} onClick={() => {
            const _bottomRow = document.getElementById("scroll-top")
            _bottomRow.scrollIntoView()
          }}>
          Scroll to Top <Icon type="arrow-up" />
        </ScrollText>
      </Row>
    </>
  )
}

export default EvidenceTimeline
