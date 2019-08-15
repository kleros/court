import React from 'react'
import { Link, withRouter } from 'react-router-dom'
import styled from 'styled-components/macro'

const StyledDiv = styled.div`
  display: inline-block;
  width: 100%;
  padding: 0 16px;
`

const CaseSummaryBody = styled.div`
  background: white;
  box-shadow: 0px 6px 36px #BC9CFF;
  border-radius: 12px;
`

const CaseSummaryCard = ({ dispute }) => {
  return (
    <StyledDiv>
      <CaseSummaryBody>
        {dispute.ID}
      </CaseSummaryBody>
    </StyledDiv>
  )
}

export default withRouter(CaseSummaryCard)
