import { Button, Col, Row } from 'antd'
import CourtCard from '../components/court-card'
import React from 'react'
import TopBanner from '../components/top-banner'

export default () => (
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
    <Row gutter={40}>
      <Col span={8}>
        <CourtCard ID={0} />
      </Col>
      <Col span={8}>
        <CourtCard ID={0} />
      </Col>
      <Col span={8}>
        <CourtCard ID={0} />
      </Col>
      <Col span={8}>
        <CourtCard ID={0} />
      </Col>
    </Row>
  </>
)
