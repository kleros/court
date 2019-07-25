import { Button, Col, Row, Skeleton } from 'antd'
import React from 'react'

import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import CasesListCard from '../components/cases-list-card'
import CourtsListCard from '../components/courts-list-card'
import { Link } from 'react-router-dom'
import RewardCard from '../components/reward-card'
import PNKStatsListCard from '../components/pnk-stats-list-card'
import TopBanner from '../components/top-banner'
import WelcomeCard from '../components/welcome-card'
import darkLogo from '../assets/images/dark-logo.png'
import styled from 'styled-components/macro'
import { version } from '../../package.json'

const StyledImg = styled.img`
  max-width: 90%;
`
export default () => {
  const { useCacheCall } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0]
  }))
  const PNK = useCacheCall(
    'MiniMeTokenERC20',
    'balanceOf',
    drizzleState.account
  )
  const noPNK = PNK === '0'
  return (
    <>
      <TopBanner
        description={
          <Skeleton active loading={!PNK} paragraph={false}>
            {noPNK
              ? "If you don't have some, buy PNK to get started."
              : 'The interface for the blockchain dispute resolution layer.'}
          </Skeleton>
        }
        extra={
          noPNK && (
            <Link to="/tokens">
              <Button size="large" type="primary">
                Buy PNK
              </Button>
            </Link>
          )
        }
        title="Kleros Juror Dashboard"
      />
    <RewardCard />
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
}
