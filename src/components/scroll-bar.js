import { Row, Col, Icon } from 'antd'
import React from 'react'
import styled from 'styled-components'

const CenteredScrollText = styled(Col)`
  font-weight: 500;
  font-size: 18px;
  line-height: 21px;
  text-align: center;
  color: #4D00B4;
`

const ScrollBar = ({ currentOption, numberOfOptions, setOption }) => {
  return (
    <Row>
      <Col lg={1}>
        <Icon
          type="left"
          style={{color: '#4D00B4'}}
          onClick={() => setOption((currentOption === 0) ? numberOfOptions : currentOption - 1)}
        />
      </Col>
      <CenteredScrollText lg={22}>
        {currentOption + 1} / {numberOfOptions + 1}
      </CenteredScrollText>
      <Col lg={1}>
        <Icon
          type="right"
          style={{color: '#4D00B4', float: 'right'}}
          onClick={() => setOption((currentOption === numberOfOptions) ? 0 : currentOption + 1)}
        />
      </Col>
    </Row>
  )
}

export default ScrollBar
