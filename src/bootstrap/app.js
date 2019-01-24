import '../components/theme.css'
import { BrowserRouter, NavLink, Route, Switch } from 'react-router-dom'
import { Col, Layout, Menu, Row } from 'antd'
import { DrizzleProvider, Initializer } from '../temp/drizzle-react-hooks'
import { ArchonInitializer } from './archon'
import Case from '../containers/case'
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
import { register } from './service-worker'
import styled from 'styled-components/macro'

const MenuItems = [
  <Menu.Item key="home">
    <NavLink to="/">Home</NavLink>
  </Menu.Item>,
  <Menu.Item key="courts">
    <NavLink to="/courts">Courts</NavLink>
  </Menu.Item>,
  <Menu.Item key="cases">
    <NavLink to="/cases">Cases</NavLink>
  </Menu.Item>,
  <Menu.Item key="tokens">
    <NavLink to="/tokens">Tokens</NavLink>
  </Menu.Item>,
  // <Menu.Item key="governance">
  //   <NavLink to="/governance">Governance</NavLink>
  // </Menu.Item>,
  <Menu.Item key="guide">
    <NavLink to="/guide">Guide</NavLink>
  </Menu.Item>
]
const StyledLayoutSider = styled(Layout.Sider)`
  height: 100%;
  position: fixed;
  z-index: 2000;

  @media (min-width: 768px) {
    display: none;
  }

  .ant-layout-sider-zero-width-trigger {
    right: -50px;
    top: 12px;
    width: 50px;
  }
`
const StyledCol = styled(Col)`
  align-items: center;
  display: flex;
  height: 64px;
  justify-content: space-evenly;

  @media (max-width: 575px) {
    &.ant-col-xs-0 {
      display: none;
    }
  }
`
const StyledMenu = styled(Menu)`
  font-weight: bold;
  line-height: 64px !important;
  text-align: center;
`
const StyledLayoutContent = styled(Layout.Content)`
  background: white;
  padding: 0 9.375vw 62px;
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
              <StyledLayoutSider breakpoint="md" collapsedWidth="0">
                <Menu theme="dark">{MenuItems}</Menu>
              </StyledLayoutSider>
              <Layout>
                <Layout.Header>
                  <Row>
                    <StyledCol md={3} sm={16} xs={0}>
                      <Logo />
                    </StyledCol>
                    <Col md={16} xs={0}>
                      <StyledMenu mode="horizontal" theme="dark">
                        {MenuItems}
                      </StyledMenu>
                    </Col>
                    <StyledCol md={5} sm={8} xs={24}>
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
                    <Route component={Case} exact path="/cases/:ID" />
                    <Route exact path="/tokens" />
                    {/* <Route exact path="/governance" /> */}
                    <Route exact path="/guide" />
                  </Switch>
                </StyledLayoutContent>
              </Layout>
            </Layout>
          </BrowserRouter>
        </ArchonInitializer>
      </Initializer>
    </DrizzleProvider>
  </>
)

register()
