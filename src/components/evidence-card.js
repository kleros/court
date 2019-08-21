import { Card } from 'antd'
import React from 'react'
import styled from 'styled-components'

const StyledCard = styled(Card)`
  background: #FFFFFF;
  box-shadow: 0px 6px 36px #BC9CFF;
  border-radius: 12px;
`
const StyledTitle = styled.div`
  color: #4D00B4;
  font-weight: 500;
  font-size: 18px;
  margin-bottom: 16px;
  line-height: 21px;
`
const StyledDescription = styled.div`
  color: #000000;
  font-size: 14px;
  line-height: 16px;
  margin-bottom: 12px;
  min-height: 50px;
`
const StyledFooter = styled.div`
  background: #F5F1FD;
  height: 60px;
`
const StyledSupport = styled.div`
`
const StyledSubmitter = styled.div`
`
const StyledFiles = styled.div`
`

const EvidenceCard = ({ evidence }) => (
  <StyledCard>
    <StyledTitle>
      {evidence.evidenceJSON.title}
    </StyledTitle>
    <StyledDescription>
      {evidence.evidenceJSON.description}
    </StyledDescription>
    <StyledFooter>
      <StyledSupport>
      </StyledSupport>
      <StyledSubmitter>
      </StyledSubmitter>
      <StyledFiles>
      </StyledFiles>
    </StyledFooter>
  </StyledCard>
)

export default EvidenceCard
