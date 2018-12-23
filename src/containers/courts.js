import { Button } from 'antd'
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
  </>
)
