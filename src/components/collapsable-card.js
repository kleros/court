import React, { useState } from 'react'
import styled from 'styled-components'
import { ReactComponent as ArrowUp } from '../assets/images/arrow-up.svg'
import { ReactComponent as ArrowDown } from '../assets/images/arrow-down.svg'

const CollapsableCard = styled.div`
  background: #fbf9fe;
  border: 1px solid #d09cff;
  border-radius: 3px;
  box-sizing: border-box;
  margin-bottom: 28px;
  padding: 0;
`
const StyledHeader = styled.div`
  background: #4d00b4;
  border-radius: 3px;
  color: white;
  display: flex;
  justify-content: space-between;
  padding: 15px 30px;
`

const DetailsArea = ({ title, children, headerSpacing = false }) => {
  const [showInputs, setShowInputs] = useState(false)

  return (
    <CollapsableCard>
      <StyledHeader
        onClick={() => setShowInputs(!showInputs)}
        style={{ cursor: 'pointer' }}
      >
        <div>{title}</div>
        {showInputs ? <ArrowUp /> : <ArrowDown />}
      </StyledHeader>
      {showInputs ? (
        <div style={headerSpacing ? { marginTop: '25px' } : {}}>{children}</div>
      ) : (
        ''
      )}
    </CollapsableCard>
  )
}

export default DetailsArea
