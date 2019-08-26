import { Card, Row, Col } from 'antd'
import React from 'react'
import styled from 'styled-components'

import EtherscanLogo from '../assets/images/etherscan-logo.png'

import Attachment from './attachment'

const StyledCard = styled(Card)`
  background: #FFFFFF;
  box-shadow: 0px 6px 36px #BC9CFF;
  border-radius: 12px;

  > .ant-card-body {
    padding-top: 12px !important;
  }
`
const StyledTitle = styled.div`
  color: #4D00B4;
  font-weight: 500;
  font-size: 18px;
  line-height: 21px;
`
const StyledDescription = styled.div`
  color: #000000;
  font-size: 14px;
  line-height: 16px;
  margin-bottom: 12px;
  min-height: 80px;
`
const StyledFooter = styled.div`
  background: #F5F1FD;
  min-height: 60px;
  margin: 0 -46px -23px -46px;
`
const StyledFooterBody = styled.div`
  padding: 13px 46px 23px;
`
const StyledSubmitter = styled.div`
  color: #4D00B4;
  font-size: 14px;
  font-weight: 500;
`
const StyledTime = styled.div`
  font-weight: 400;
`
const StyledFiles = styled.div`
`

const truncateAddress = (address) => (
  `${address.substring(0, 6)}...${address.substring(address.length - 4, address.length)}`
)

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']

export const displayDateUTC = (dateString) => {
  const _date = new Date(dateString)

  const date = String(_date.getUTCDate()).replace(/\b(\d{1})\b/g, '0$1')
  const month = _date.getUTCMonth()
  const year = _date.getUTCFullYear()
  const hours = String(_date.getUTCHours()).replace(/\b(\d{1})\b/g, '0$1')
  const minutes = String(_date.getUTCMinutes()).replace(/\b(\d{1})\b/g, '0$1')

  return `${date} ${months[month]} ${year} ${hours}:${minutes} UTC`
}

const EvidenceCard = ({ evidence, metaEvidence }) => {
  const submittedAtDate = new Date(evidence.submittedAt * 1000)

  return (
    <StyledCard
      extra={(
        <a href={`https://etherscan.com/address/${evidence.submittedBy}`}>
          <img src={EtherscanLogo} />
        </a>
      )}
      title={(
        <StyledTitle>
          {evidence.evidenceJSON.title}
        </StyledTitle>)
      }
    >
      <StyledDescription>
        {evidence.evidenceJSON.description}
      </StyledDescription>
      <StyledFooter>
        <StyledFooterBody>
          <Row>
            <Col lg={23}>
              <StyledSubmitter>
                Submitted By: {
                  metaEvidence.aliases[evidence.submittedBy] ?
                  metaEvidence.aliases[evidence.submittedBy] :
                  truncateAddress(evidence.submittedBy)
                }
                <StyledTime>
                  {displayDateUTC(submittedAtDate)}
                </StyledTime>
              </StyledSubmitter>
            </Col>
            <Col lg={1}>
              <Attachment
                URI={metaEvidence.fileURI}
                extension={metaEvidence.fileTypeExtension}
              />
            </Col>
          </Row>
        </StyledFooterBody>
      </StyledFooter>
    </StyledCard>
  )
}


export default EvidenceCard
