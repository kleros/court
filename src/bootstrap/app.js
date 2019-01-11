import '../components/theme.css'
import { BrowserRouter, NavLink, Route, Switch } from 'react-router-dom'
import { Col, Layout, Menu, Row } from 'antd'
import { DrizzleProvider, Initializer } from '../temp/drizzle-react-hooks'
import { ArchonInitializer } from './archon'
import Cases from '../containers/cases'
import Courts from '../containers/courts'
import { Helmet } from 'react-helmet'
import Home from '../containers/home'
import Identicon from '../components/identicon'
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
const StyledLayoutContent = styled(Layout.Content)`
  background: white;
  padding: 0 9.375vw;
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
      'Attention! You have 6h to vote on the case number 127464 at Air Transport court.',
    to: '/',
    type: 'error'
  },
  {
    date: new Date(),
    message:
      'Attention! You have 24h to vote on the case number 127464 at Air Transport court.',
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
const settings = {
  appeal: 'When a case I ruled is appealed.',
  draw: 'When I am drawn as a juror.',
  key: 'court',
  lose: 'When I lose tokens.',
  win: 'When I win arbitration fees.'
}
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
        <ArchonInitializer>
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
                    <NotificationSettings settings={settings} />
                    <Identicon pinakion />
                  </StyledCol>
                </Row>
              </Layout.Header>
              <StyledLayoutContent>
                <Switch>
                  <Route component={Home} exact path="/" />
                  <Route component={Courts} exact path="/courts" />
                  <Route component={Cases} exact path="/cases" />
                  <Route exact path="/tokens" />
                  <Route exact path="/governance" />
                  <Route exact path="/guide" />
                </Switch>
              </StyledLayoutContent>
            </Layout>
          </BrowserRouter>
        </ArchonInitializer>
      </Initializer>
    </DrizzleProvider>
  </>
)
