import { Button, Col, Row } from 'antd'
import CourtsListCard from '../components/courts-list-card'
import { ReactComponent as DarkLogo } from '../assets/images/dark-logo.svg'
import PNKBalanceCard from '../components/pnk-balance-card'
import React from 'react'
import TopBanner from '../components/top-banner'
import WelcomeCard from '../components/welcome-card'
import { version } from '../../package.json'

export default () => (
  <>
    <TopBanner
      description="Get started by buying PNK if you don't have any already."
      extra={
        <Button size="large" type="primary">
          Buy PNK
        </Button>
      }
      title="Welcome to the Kleros Juror Dashboard!"
    />
    <WelcomeCard
      icon={<DarkLogo />}
      text="Welcome"
      version={`Athena release ${version}`}
    />
    <PNKBalanceCard />
    <Row gutter={32}>
      <Col span={6}>
        <CourtsListCard />
      </Col>
      <Col span={6}>
        <CourtsListCard />
      </Col>
      <Col span={12}>
        <CourtsListCard />
      </Col>
    </Row>
  </>
)
