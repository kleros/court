import { Button, Divider, Radio } from 'antd'
import React, { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import TopBanner from '../components/top-banner'
import styled from 'styled-components/macro'

const StyledRadioGroup = styled(Radio.Group)`
  float: right;
`
export default () => {
  const [filter, setFilter] = useState(true)
  return (
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
      <StyledRadioGroup
        buttonStyle="solid"
        name="filter"
        onChange={useCallback(e => setFilter(e.target.value), [])}
        value={filter}
      >
        <Radio.Button value>To Vote</Radio.Button>
        <Radio.Button value={false}>Voted</Radio.Button>
      </StyledRadioGroup>
      <Divider />
    </>
  )
}
