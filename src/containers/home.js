import { Button, Col, Row } from 'antd'
import React from 'react'
import styled from 'styled-components'

import CasesListCard from '../components/cases-list-card'
import CourtsListCard from '../components/courts-list-card'
import { Link } from 'react-router-dom'
import RewardCard from '../components/reward-card'
import PerformanceCard from '../components/performance-card'
import OngoingCasesCard from '../components/ongoing-cases-card'
import NotificationsCard from '../components/notifications-card'
import TopBanner from '../components/top-banner'

const StyledButton = styled(Button)`
  float: right;
`
export default () => (
    <>
      <TopBanner
        title={"Welcome!"}
        description={"This is the Kleros Juror Dashboard"}
        extra={(
            <Link to="/courts">
              <StyledButton size="large" type="primary" style={{maxWidth: '120px'}}>
                Join a Court
              </StyledButton>
            </Link>
          )
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
