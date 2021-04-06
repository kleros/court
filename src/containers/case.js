import { Button, Row, Col, Tooltip } from 'antd'
import React, { useMemo } from 'react'
import { drizzleReactHooks } from '@drizzle/react-plugin'
import CaseDetailsCard from '../components/case-details-card'
import ETHAmount from '../components/eth-amount'
import TimeAgo from '../components/time-ago'
import TopBanner from '../components/top-banner'
import styled from 'styled-components/macro'
import { VIEW_ONLY_ADDRESS } from '../bootstrap/dataloader'

const { useDrizzle, useDrizzleState } = drizzleReactHooks

const StyledDiv = styled.div`
  font-weight: bold;
`
const StyledBigTextDiv = styled(StyledDiv)`
  font-size: 20px;
`
const StyledButton = styled(Button)`
  flex: 0 0 35%;
  margin: 15px 5px 0px;
`
const ResolvedTag = styled.div`
  border: 1px solid;
  border-radius: 3px;
  float: right;
  margin-right: 50px;
  padding: 5px;
  text-align: center;
  width: 80px;
`
const MANUAL_PASS_DELAY = 3600
export default ({
  match: {
    params: { ID }
  }
}) => {
  const { drizzle, useCacheCall, useCacheEvents, useCacheSend } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS
  }))
  const { send: sendPassPeriod } = useCacheSend('KlerosLiquid', 'passPeriod')
  const { send: sendExecuteRuling } = useCacheSend(
    'KlerosLiquid',
    'executeRuling'
  )
  const dispute = useCacheCall('KlerosLiquid', 'disputes', ID)
  const dispute2 = useCacheCall('KlerosLiquid', 'getDispute', ID)
  const draws = useCacheEvents(
    'KlerosLiquid',
    'Draw',
    useMemo(
      () => ({
        filter: { _address: drizzleState.account, _disputeID: ID },
        fromBlock: process.env.REACT_APP_KLEROS_LIQUID_BLOCK_NUMBER
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
      if (dispute && !dispute.ruled) {
        const subcourt = call('KlerosLiquid', 'getSubcourt', dispute.subcourtID)
        if (subcourt) {
          disputeData.deadline =
            dispute.period < 4
              ? new Date(
                  (Number(dispute.lastPeriodChange) +
                    Number(subcourt.timesPerPeriod[dispute.period])) *
                    1000
                )
              : null
          disputeData.showPassPeriod =
            dispute.period < 4
              ? parseInt(new Date().getTime() / 1000) -
                  Number(dispute.lastPeriodChange) >
                Number(subcourt.timesPerPeriod[dispute.period]) +
                  MANUAL_PASS_DELAY
              : true
        }
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
          <Row>
            {dispute && dispute.ruled ? (
              <ResolvedTag>Resolved</ResolvedTag>
            ) : (
              <>
                {disputeData.deadline && (
                  <Col lg={disputeData.showPassPeriod ? 12 : 24}>
                    <StyledDiv>
                      {
                        ['Evidence', 'Commit', 'Vote', 'Appeal', 'Execute'][
                          dispute.period
                        ]
                      }{' '}
                      Period Over
                    </StyledDiv>
                    <StyledBigTextDiv>
                      <TimeAgo className="primary-color theme-color">
                        {disputeData.deadline}
                      </TimeAgo>
                    </StyledBigTextDiv>
                  </Col>
                )}
                {disputeData.showPassPeriod ? (
                  <Col lg={12}>
                    {Number(dispute.period) === 4 ? (
                      <Tooltip title={'Enforce the ruling of this case'}>
                        <StyledButton
                          type="primary"
                          onClick={() => {
                            sendExecuteRuling(ID)
                          }}
                        >
                          Execute Ruling
                        </StyledButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title={'Advance this case to the next phase'}>
                        <StyledButton
                          type="primary"
                          onClick={() => {
                            sendPassPeriod(ID)
                          }}
                        >
                          Pass Period
                        </StyledButton>
                      </Tooltip>
                    )}
                  </Col>
                ) : (
                  ''
                )}
              </>
            )}
          </Row>
        }
        title="Case Details"
      />
      <CaseDetailsCard ID={ID} />
    </>
  )
}
