import { Col, Row } from 'antd'
import BuyPNKCard from '../components/buy-pnk-card'
import PNKBalanceCard from '../components/pnk-balance-card'
import PNKExchangesCard from '../components/pnk-exchanges-card'
import React from 'react'
import TopBanner from '../components/top-banner'

export default () => (
  <>
    <TopBanner
      description="Buy Pinakion (PNK). The more PNK you stake, the higher your chances of being drawn as a juror."
      title="Tokens"
    />
    <PNKBalanceCard />
    <Row gutter={40}>
      <Col lg={8} md={12}>
        <BuyPNKCard />
      </Col>
      <Col lg={8} md={12}>
        <PNKExchangesCard />
      </Col>
    </Row>
  </>
)
