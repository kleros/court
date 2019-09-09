import { Col, Row } from 'antd'
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
  padding: 15px 30px;
`

const DetailsArea = ({ title, children, headerSpacing = false }) => {
  const [showInputs, setShowInputs] = useState(false)

  return (
    <CollapsableCard>
      <StyledHeader>
        <Row>
          <Col lg={8}>{title}</Col>
          <Col lg={1} offset={15}>
            {showInputs ? (
              <ArrowUp
                onClick={() => setShowInputs(!showInputs)}
                style={{ cursor: 'pointer' }}
              />
            ) : (
              <ArrowDown
                onClick={() => setShowInputs(!showInputs)}
                style={{ cursor: 'pointer' }}
              />
            )}
          </Col>
        </Row>
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
