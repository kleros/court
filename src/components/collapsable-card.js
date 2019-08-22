import { Row, Col } from 'antd'
import React, { useState } from 'react'
import styled from 'styled-components'

import { ReactComponent as ArrowUp } from '../assets/images/arrow-up.svg'
import { ReactComponent as ArrowDown } from '../assets/images/arrow-down.svg'

const CollapsableCard = styled.div`
  background: #FBF9FE;
  border: 1px solid #D09CFF;
  box-sizing: border-box;
  border-radius: 3px;
  padding: 0;
  margin-bottom: 28px;
`
const StyledHeader = styled.div`
  background: #4D00B4;
  border-radius: 3px;
  color: white;
  padding: 15px 30px;
`
const StyledBody = styled.div`
  padding: 35px 10%;
`

const DetailsArea = ({ title, children, headerSpacing=false }) => {
  const [showInputs, setShowInputs] = useState(false)

  return (
    <CollapsableCard>
      <StyledHeader>
        <Row>
          <Col lg={8}>{title}</Col>
          <Col lg={1} offset={15}>
            {
              showInputs ? (
                <ArrowUp onClick={() => setShowInputs(!showInputs)} style={{cursor: "pointer"}} />
              ) : (
                <ArrowDown onClick={() => setShowInputs(!showInputs)} style={{cursor: "pointer"}} />
              )
            }
          </Col>
        </Row>
      </StyledHeader>
      {showInputs ? (
        <StyledBody style={headerSpacing ? {marginTop: '25px'} : {}}>{children}</StyledBody>
      ) : ''}
    </CollapsableCard>
  )
}

export default DetailsArea
