import '../components/theme.css'
import { BrowserRouter, NavLink, Route, Switch } from 'react-router-dom'
import { Col, Layout, Menu, Row } from 'antd'
import { DrizzleProvider, Initializer } from '../temp/drizzle-react-hooks'
import { Helmet } from 'react-helmet'
import Home from '../containers/home'
import { ReactComponent as Logo } from '../assets/images/logo.svg'
import Notifications from '../components/notifications'
import React from 'react'
import drizzle from './drizzle'
import styled from 'styled-components/macro'

const StyledCol = styled(Col)`
  line-height: 84px;
  text-align: center;
`
const StyledMenu = styled(Menu)`
  font-weight: bold;
  line-height: 64px !important;
  text-align: center;
`
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
                  <Notifications
                    notifications={[
                      {
                        date: new Date(),
                        message: 'Message',
                        to: '/',
                        type: 'info'
                      }
                    ]}
                  />
                </StyledCol>
              </Row>
            </Layout.Header>
            <Layout.Content>
              <Switch>
                <Route exact path="/" component={Home} />
                <Route exact path="/courts" component={Home} />
                <Route exact path="/cases" component={Home} />
                <Route exact path="/tokens" component={Home} />
                <Route exact path="/governance" component={Home} />
                <Route exact path="/guide" component={Home} />
              </Switch>
            </Layout.Content>
          </Layout>
        </BrowserRouter>
      </Initializer>
    </DrizzleProvider>
  </>
)
