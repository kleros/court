import { Button, Col, Row } from 'antd'
import CasesListCard from '../components/cases-list-card'
import React from 'react'
import CourtsListCard from '../components/courts-list-card'
import { Link } from 'react-router-dom'
import NotificationsCard from '../components/notifications-card'
import OngoingCasesCard from '../components/ongoing-cases-card'
import PerformanceCard from '../components/performance-card'
import RewardCard from '../components/reward-card'
import TopBanner from '../components/top-banner'
import styled from 'styled-components'

const StyledButton = styled(Button)`
  box-shadow: none;
  float: right;
  text-shadow: none;
`
export default () => (
  <>
    <TopBanner
      title="Welcome!"
      description="This is the Kleros Juror Dashboard"
      extra={
        <Link to="/courts">
          <StyledButton
            size="large"
            style={{ maxWidth: '120px' }}
            type="primary"
          >
            Join a Court
          </StyledButton>
        </Link>
      }
    />
    <RewardCard />
    <Row gutter={32}>
      <Col lg={8}>
        <CourtsListCard />
      </Col>
      <Col lg={8}>
        <CasesListCard />
      </Col>
      <Col lg={8}>
        <PerformanceCard />
      </Col>
    </Row>
    <OngoingCasesCard />
    <NotificationsCard />
  </>
)
