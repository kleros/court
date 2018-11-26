import '../components/theme.css'
import { BrowserRouter, NavLink, Route, Switch } from 'react-router-dom'
import { Col, Layout, Menu, Row } from 'antd'
import { DrizzleProvider, Initializer } from '../temp/drizzle-react-hooks'
import { Helmet } from 'react-helmet'
import Home from '../containers/home'
import { ReactComponent as Logo } from '../assets/images/logo.svg'
import NotificationSettings from '../components/notification-settings'
import Notifications from '../components/notifications'
import React from 'react'
import drizzle from './drizzle'
import styled from 'styled-components/macro'

const StyledCol = styled(Col)`
  align-items: center;
  display: flex;
  height: 64px;
  justify-content: space-evenly;
`
const StyledMenu = styled(Menu)`
  font-weight: bold;
  line-height: 64px !important;
  text-align: center;
`
const notifications = [
  {
    date: new Date(),
    message:
      'Congratulations! You have been drawn as a juror to a case on Air Transport court.',
    to: '/',
    type: 'info'
  },
  {
    date: new Date(),
    message:
      'Attention! You have 6h to vote on the case #127464 at Air Transport court.',
    to: '/',
    type: 'error'
  },
  {
    date: new Date(),
    message:
      'Attention! You have 24h to vote on the case #127464 at Air Transport court.',
    to: '/',
    type: 'warning'
  },
  {
    date: new Date(),
    message:
      'Congratulations! You have been drawn as a juror to a case on Air Transport court.',
    to: '/',
    type: 'info'
  }
]
export default () => (
  <>
    <Helmet>
      <title>Kleros · Court</title>
      <link
        href="https://fonts.googleapis.com/css?family=Roboto:400,400i,500,500i,700,700i"
        rel="stylesheet"
      />
    </Helmet>
    <DrizzleProvider drizzle={drizzle}>
      <Initializer>
        <BrowserRouter>
          <Layout>
            <Layout.Header>
              <Row>
                <StyledCol span={4}>
                  <Logo />
                </StyledCol>
                <Col span={16}>
                  <StyledMenu mode="horizontal" theme="dark">
                    <Menu.Item key="home">
                      <NavLink to="/">Home</NavLink>
                    </Menu.Item>
                    <Menu.Item key="courts">
                      <NavLink to="/courts">Courts</NavLink>
                    </Menu.Item>
                    <Menu.Item key="cases">
                      <NavLink to="/cases">Cases</NavLink>
                    </Menu.Item>
                    <Menu.Item key="tokens">
                      <NavLink to="/tokens">Tokens</NavLink>
                    </Menu.Item>
                    <Menu.Item key="governance">
                      <NavLink to="/governance">Governance</NavLink>
                    </Menu.Item>
                    <Menu.Item key="guide">
                      <NavLink to="/guide">Guide</NavLink>
                    </Menu.Item>
                  </StyledMenu>
                </Col>
                <StyledCol span={4}>
                  <Notifications notifications={notifications} />
                  <NotificationSettings />
                </StyledCol>
              </Row>
            </Layout.Header>
            <Layout.Content>
              <Switch>
                <Route component={Home} exact path="/" />
                <Route component={Home} exact path="/courts" />
                <Route component={Home} exact path="/cases" />
                <Route component={Home} exact path="/tokens" />
                <Route component={Home} exact path="/governance" />
                <Route component={Home} exact path="/guide" />
              </Switch>
            </Layout.Content>
          </Layout>
        </BrowserRouter>
      </Initializer>
    </DrizzleProvider>
  </>
)
