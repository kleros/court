import React, { useMemo } from 'react'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import { ReactComponent as Hourglass } from '../assets/images/hourglass.svg'
import { List } from 'antd'
import TimeAgo from './time-ago'
import TitledListCard from './titled-list-card'
import styled from 'styled-components/macro'

const StyledListItem = styled(List.Item)`
  font-weight: bold;
  padding-left: 19px;
  position: relative;

  .ant-list-item-extra {
    font-size: 18px;
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
  }
`
const StyledDiv = styled.div`
  background: whitesmoke;
  padding: 30px 22px;
  position: relative;
  text-align: center;
`
const StyledDeadlineDiv = styled.div`
  font-weight: medium;
`
const StyledTimeAgo = styled(TimeAgo)`
  font-size: 24px;
  font-weight: bold;
`
const StyledHourglass = styled(Hourglass)`
  position: absolute;
  right: 13px;
  top: 13px;
`
const CasesListCard = () => {
  const { useCacheCall, useCacheEvents } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0]
  }))
  const draws = useCacheEvents(
    'KlerosLiquid',
    'Draw',
    useMemo(
      () => ({
        filter: { _address: drizzleState.account },
        fromBlock: 0
      }),
      [drizzleState.account]
    )
  )
  const disputes = useCacheCall(['KlerosLiquid'], call =>
    draws
      ? draws.reduce(
          (acc, d) => {
            if (!acc.IDs[d.returnValues._disputeID]) {
              acc.IDs[d.returnValues._disputeID] = true
              acc.total++
              const dispute = call(
                'KlerosLiquid',
                'disputes',
                d.returnValues._disputeID
              )
              if (dispute) {
                acc[dispute.period === '4' ? 'executed' : 'active']++
                if (dispute.period === '1' || dispute.period === '2') {
                  const dispute2 = call(
                    'KlerosLiquid',
                    'getDispute',
                    d.returnValues._disputeID
                  )
                  if (dispute2) {
                    if (
                      Number(d.returnValues._appeal) ===
                      dispute2.votesLengths.length - 1
                    ) {
                      const subcourt = call(
                        'KlerosLiquid',
                        'getSubcourt',
                        dispute.subcourtID
                      )
                      if (subcourt) {
                        const deadline = new Date(
                          (Number(dispute.lastPeriodChange) +
                            Number(subcourt.timesPerPeriod[dispute.period])) *
                            1000
                        )
                        if (!acc.deadline || deadline < acc.deadline)
                          acc.deadline = deadline
                      } else acc.loading = true
                    }
                  } else acc.loading = true
                }
              } else acc.loading = true
            }
            return acc
          },
          { IDs: {}, active: 0, executed: 0, loading: false, total: 0 }
        )
      : { loading: true }
  )
  return (
    <TitledListCard
      loading={disputes.loading}
      prefix={disputes.total}
      title="Cases"
    >
      <StyledListItem extra={String(disputes.active)}>Active</StyledListItem>
      <StyledListItem extra={String(disputes.executed)}>
        Executed
      </StyledListItem>
      {disputes.deadline && (
        <StyledDiv className="primary-color theme-color">
          <StyledDeadlineDiv>Next voting deadline</StyledDeadlineDiv>
          <StyledTimeAgo>{disputes.deadline}</StyledTimeAgo>
          <StyledHourglass className="primary-fill" />
        </StyledDiv>
      )}
    </TitledListCard>
  )
}

export default CasesListCard
