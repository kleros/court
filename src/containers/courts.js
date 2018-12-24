import { Button, Col, Row, Spin } from 'antd'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import CourtCard from '../components/court-card'
import React from 'react'
import TopBanner from '../components/top-banner'

export default () => {
  const { cacheCall } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0]
  }))
  const subcourtIDs = cacheCall(
    'KlerosLiquid',
    'getJuror',
    drizzleState.account
  )
  return (
    <>
      <TopBanner
        description="Select courts and stake PNK."
        extra={
          <Button size="large" type="primary">
            Select Court
          </Button>
        }
        title="Courts"
      />
      My Courts
      <Spin spinning={!subcourtIDs}>
        <Row gutter={40}>
          {subcourtIDs &&
            subcourtIDs.map(ID => (
              <Col key={ID} span={8}>
                <CourtCard ID={ID} />
              </Col>
            ))}
        </Row>
      </Spin>
    </>
  )
}
