import React from 'react'
import ReactDOM from 'react-dom'
import { Button } from 'antd'

import styled from 'styled-components/macro'

import 'antd/dist/antd.css'

const HelloWorld = styled(({ className }) => (
  <div className={className}>
    <Button type="primary">Hello World</Button>
  </div>
))`
  border: 2px solid red;
  width: 110px;
`
ReactDOM.render(<HelloWorld />, document.getElementById('root'))
