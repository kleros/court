import { Button } from 'antd'
import { Drizzle, generateStore } from 'drizzle'
import { DrizzleContext } from 'drizzle-react'
import React from 'react'
import ReactDOM from 'react-dom'

import KlerosLiquid from './assets/contracts/kleros-liquid.json'
import Pinakion from './assets/contracts/pinakion.json'

import styled from 'styled-components/macro'

import 'antd/dist/antd.css'

const options = {
  contracts: [
    {
      ...KlerosLiquid,
      networks: { 42: { address: process.env.KLEROS_LIQUID_KOVAN_ADDRESS } }
    },
    {
      ...Pinakion,
      networks: { 42: { address: process.env.PINAKION_KOVAN_ADDRESS } }
    }
  ]
}
const drizzle = new Drizzle(options, generateStore(options))

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
