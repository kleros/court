import { Button } from 'antd'
import { Link } from 'react-router-dom'
import React from 'react'
import TopBanner from '../components/top-banner'

export default () => (
  <>
    <TopBanner
      description="Select a case you have been drawn in, study the evidence, and vote."
      extra={
        <Link to="/cases/history">
          <Button size="large" type="primary">
            Cases History
          </Button>
        </Link>
      }
      title="Cases"
    />
    My Cases
  </>
)
