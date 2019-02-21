import React, { useMemo } from 'react'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import CaseDetailsCard from '../components/case-details-card'
import ETHAmount from '../components/eth-amount'
import TimeAgo from '../components/time-ago'
import TopBanner from '../components/top-banner'
import styled from 'styled-components/macro'

const StyledDiv = styled.div`
  font-weight: bold;
`
const StyledBigTextDiv = styled(StyledDiv)`
  font-size: 20px;
`
export default ({
  match: {
    params: { ID }
  }
}) => {
  const { drizzle, useCacheCall, useCacheEvents } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0]
  }))
  const dispute = useCacheCall('KlerosLiquid', 'disputes', ID)
  const dispute2 = useCacheCall('KlerosLiquid', 'getDispute', ID)
  const draws = useCacheEvents(
    'KlerosLiquid',
    'Draw',
    useMemo(
      () => ({
        filter: { _address: drizzleState.account, _disputeID: ID },
        fromBlock: 0
      }),
      [drizzleState.account, ID]
    )
  )
  const disputeData = useCacheCall(['KlerosLiquid'], call => {
    let disputeData = {}
    if (dispute2 && draws) {
      const tokensAtStakePerJuror = dispute2.tokensAtStakePerJuror.map(
        drizzle.web3.utils.toBN
      )
      const votesByAppeal = draws.reduce((acc, d) => {
        acc[d.returnValues._appeal] = acc[d.returnValues._appeal]
          ? acc[d.returnValues._appeal].add(drizzle.web3.utils.toBN(1))
          : drizzle.web3.utils.toBN(1)
        return acc
      }, {})
      disputeData = Object.keys(votesByAppeal).reduce(
        (acc, a) => {
          acc.atStake = acc.atStake.add(
            votesByAppeal[a].mul(tokensAtStakePerJuror[a])
          )
          return acc
        },
        {
          atStake: drizzle.web3.utils.toBN(0),
          deadline: undefined
        }
      )
      if (
        dispute &&
        dispute.period !== '4' &&
        votesByAppeal[dispute2.votesLengths.length - 1]
      ) {
        const subcourt = call('KlerosLiquid', 'getSubcourt', dispute.subcourtID)
        if (subcourt)
          disputeData.deadline = new Date(
            (Number(dispute.lastPeriodChange) +
              Number(subcourt.timesPerPeriod[dispute.period])) *
              1000
          )
      }
    }
    return disputeData
  })
  return (
    <>
      <TopBanner
        description={
          <>
            Case #{ID} | <ETHAmount amount={disputeData.atStake} /> PNK Locked
          </>
        }
        extra={
          disputeData.deadline && (
            <>
              <StyledDiv>Voting Deadline</StyledDiv>
              <StyledBigTextDiv>
                <TimeAgo className="primary-color theme-color">
                  {disputeData.deadline}
                </TimeAgo>
              </StyledBigTextDiv>
            </>
          )
        }
        title="Case Details"
      />
      <CaseDetailsCard ID={ID} />
    </>
  )
}
