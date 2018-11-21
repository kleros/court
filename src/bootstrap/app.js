import React from 'react'
import { Helmet } from 'react-helmet'
import { BrowserRouter, Switch, Route } from 'react-router-dom'

import Home from '../containers/home'

import drizzle from './drizzle'
import { DrizzleProvider } from './drizzle-react'
import Initializer from './initializer'

import 'antd/dist/antd.css'

export default () => (
  <>
    <Helmet>
      <title>Kleros · Court</title>
    </Helmet>
    <DrizzleProvider drizzle={drizzle}>
      <Initializer>
        <BrowserRouter>
          <Switch>
            <Route exact path="/" component={Home} />
          </Switch>
        </BrowserRouter>
      </Initializer>
    </DrizzleProvider>
  </>
)
