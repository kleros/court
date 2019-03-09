import { Button, Col, Row } from 'antd'
import CasesListCard from '../components/cases-list-card'
import CourtsListCard from '../components/courts-list-card'
import { Link } from 'react-router-dom'
import PNKBalanceCard from '../components/pnk-balance-card'
import PNKStatsListCard from '../components/pnk-stats-list-card'
import React from 'react'
import TopBanner from '../components/top-banner'
import WelcomeCard from '../components/welcome-card'
import darkLogo from '../assets/images/dark-logo.png'
import styled from 'styled-components/macro'
import { version } from '../../package.json'

const StyledImg = styled.img`
  max-width: 90%;
`
export default () => (
  <>
    <TopBanner
      description="If you don't have some, buy PNK to get started."
      extra={
        <Link to="/tokens">
          <Button size="large" type="primary">
            Buy PNK
          </Button>
        </Link>
      }
      title="Kleros Juror Dashboard"
    />
    <WelcomeCard
      icon={<StyledImg alt="Kleros Logo with Dark Text" src={darkLogo} />}
      text="Welcome"
      version={`Athena release ${version}`}
    />
    <PNKBalanceCard />
    <Row gutter={32}>
      <Col lg={6}>
        <CourtsListCard />
      </Col>
      <Col lg={6}>
        <CasesListCard />
      </Col>
      <Col lg={12}>
        <PNKStatsListCard />
      </Col>
    </Row>
  </>
)
