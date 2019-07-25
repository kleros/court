import { Col, Divider, Radio, Row, Spin } from 'antd'
import React, { useCallback, useMemo, useState } from 'react'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import CaseCard from '../components/case-card'
// import { Link } from 'react-router-dom'
import TopBanner from '../components/top-banner'
import styled from 'styled-components/macro'

const StyledRadioGroup = styled(Radio.Group)`
  float: right;
`
const StyledCol = styled(Col)`
  color: gainsboro;
`
export default () => {
  const { useCacheCall, useCacheEvents } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0]
  }))
  const [filter, setFilter] = useState(0)
  const draws = useCacheEvents(
    'KlerosLiquid',
    'Draw',
    useMemo(
      () => ({
        filter: { _address: drizzleState.account },
        fromBlock: process.env.REACT_APP_KLEROS_LIQUID_BLOCK_NUMBER
      }),
      [drizzleState.account]
    )
  )
  const disputes = useCacheCall(['KlerosLiquid'], call =>
    draws
      ? Object.values(
          draws.reduce((acc, d) => {
            acc[d.returnValues._disputeID] = d
            return acc
          }, {})
        ).reduce(
          (acc, d) => {
            const dispute = call(
              'KlerosLiquid',
              'disputes',
              d.returnValues._disputeID
            )
            if (dispute)
              if (dispute.period === '1' || dispute.period === '2') {
                const dispute2 = call(
                  'KlerosLiquid',
                  'getDispute',
                  d.returnValues._disputeID
                )
                if (dispute2)
                  if (
                    Number(d.returnValues._appeal) ===
                    dispute2.votesLengths.length - 1
                  ) {
                    const vote = call(
                      'KlerosLiquid',
                      'getVote',
                      d.returnValues._disputeID,
                      d.returnValues._appeal,
                      d.returnValues._voteID
                    )
                    if (vote)
                      acc[vote.voted ? 'activeIDs' : 'votePendingIDs'].push(
                        d.returnValues._disputeID
                      )
                    else acc.loading = true
                  } else acc.activeIDs.push(d.returnValues._disputeID)
                else acc.loading = true
              } else
                acc[dispute.period === '4' ? 'executedIDs' : 'activeIDs'].push(
                  d.returnValues._disputeID
                )
            else acc.loading = true
            return acc
          },
          { activeIDs: [], executedIDs: [], loading: false, votePendingIDs: [] }
        )
      : { activeIDs: [], executedIDs: [], loading: true, votePendingIDs: [] }
  )
  const filteredDisputes =
    disputes[['votePendingIDs', 'activeIDs', 'executedIDs'][filter]]
  return (
    <>
      <TopBanner
        description="Select a case you have been drawn in, study the evidence, and vote."
        // extra={
        //   <Link to="/cases/history">
        //     <Button size="large" type="primary">
        //       History
        //     </Button>
        //   </Link>
        // }
        title="Cases"
      />
      My Cases
      <StyledRadioGroup
        buttonStyle="solid"
        name="filter"
        onChange={useCallback(e => setFilter(e.target.value), [])}
        value={filter}
      >
        <Radio.Button value={0}>Vote Pending</Radio.Button>
        <Radio.Button value={1}>In Progress</Radio.Button>
        <Radio.Button value={2}>Closed</Radio.Button>
      </StyledRadioGroup>
      <Divider />
      <Spin spinning={disputes.loading}>
        <Row gutter={48}>
          {filteredDisputes.length === 0 ? (
            <StyledCol>
              You don't have any {['vote pending', 'active', 'closed'][filter]}{' '}
              cases.
            </StyledCol>
          ) : (
            filteredDisputes.map(ID => (
              <Col key={ID} md={12} xl={8}>
                <CaseCard ID={ID} />
              </Col>
            ))
          )}
        </Row>
      </Spin>
    </>
  )
}
