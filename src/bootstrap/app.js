import React from 'react'
import { Helmet } from 'react-helmet'
import { BrowserRouter, Switch, Route } from 'react-router-dom'

import Home from '../containers/home'
import { DrizzleProvider, Initializer } from '../temp/drizzle-react-hooks'

import drizzle from './drizzle'

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
