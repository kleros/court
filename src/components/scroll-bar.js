import { Col, Icon, Row } from 'antd'
import React from 'react'
import styled from 'styled-components'

const CenteredScrollText = styled(Col)`
  color: #4d00b4;
  font-size: 18px;
  font-weight: 500;
  line-height: 21px;
  text-align: center;
`

const ScrollBar = ({ currentOption, numberOfOptions, setOption }) => (
  <Row>
    <Col lg={1}>
      <Icon
        onClick={() =>
          setOption(currentOption === 0 ? numberOfOptions : currentOption - 1)
        }
        style={{ color: '#4D00B4' }}
        type="left"
      />
    </Col>
    <CenteredScrollText lg={22}>
      {currentOption + 1} / {numberOfOptions + 1}
    </CenteredScrollText>
    <Col lg={1}>
      <Icon
        onClick={() =>
          setOption(currentOption === numberOfOptions ? 0 : currentOption + 1)
        }
        style={{ color: '#4D00B4' }}
        type="right"
      />
    </Col>
  </Row>
)

export default ScrollBar
