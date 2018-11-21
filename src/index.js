import { Button } from 'antd'
import { DrizzleContext } from 'drizzle-react'
import React from 'react'
import ReactDOM from 'react-dom'

import drizzle from './bootstrap/drizzle'

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
const App = () => (
  <DrizzleContext.Provider drizzle={drizzle}>
    <HelloWorld />
  </DrizzleContext.Provider>
)
ReactDOM.render(<App />, document.getElementById('root'))
