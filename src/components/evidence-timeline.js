import { Row, Col } from 'antd'
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
const RulingDiv = styled.div`
`

const EvidenceTimeline = ({evidence = [], events = [], ruling = null}) => {
  // Sort so most recent is first
  const sortedEvidence = evidence.sort((a, b) => {
    if (a.submittedAt > b.submittedAt) return -1
    else if (a.submittedAt < b.submittedAt) return 1

    return 0
  })

  console.log(sortedEvidence)

  return (
    <>
      <Row>
        <StyledHeaderCol lg={4}>Latest</StyledHeaderCol>
        <Col lg={16}>
        {
          ruling && (

              <RulingDiv>
                {
                  ruling ?
                    `Jurors ruled: ${ruling}` :
                    "Jurors refused to make a ruling"
                }
              </RulingDiv>
          )
        }
        </Col>
        <Col lg={4}>
          Scroll to Bottom
        </Col>
      </Row>
      {
        sortedEvidence.map(_evidence => {
          return (
            <>
              <Row><StyledDividerCol lg={12} /></Row>
              <EvidenceCard evidence={_evidence} />
            </>
          )
        })
      }
    </>
  )
}

export default EvidenceTimeline
