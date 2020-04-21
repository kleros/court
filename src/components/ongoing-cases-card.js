import { Col, Row } from 'antd'
import React, { useMemo } from 'react'
import styled from 'styled-components/macro'
import { drizzleReactHooks } from '@drizzle/react-plugin'
import { useDataloader, ZERO_ADDRESS } from '../bootstrap/dataloader'
import { ReactComponent as Gavel } from '../assets/images/gavel.svg'
import { ReactComponent as HourGlass } from '../assets/images/hourglass.svg'
import CaseSummaryCard from './case-summary-card'
import TitledListCard from './titled-list-card'
import ListItem from './list-item'

const { useDrizzle, useDrizzleState } = drizzleReactHooks

const StyledDiv = styled.div`
  margin-top: 50px;
`

const StyledPending = styled.div`
  color: #4a4a4a;
  svg {
    height: 12px;
    path {
      fill: #4a4a4a;
    }
  }
`
const StyledVoting = styled.div`
  color: #009aff;
  svg {
    height: 12px;
    path {
      fill: #009aff;
    }
  }
`
const StyledExecuted = styled.div`
  color: #f60c36;
  svg {
    height: 12px;
    path {
      fill: #f60c36;
    }
  }
`
const StyledAppealed = styled.div`
  color: #f60c36;
  svg {
    height: 12px;
    path {
      fill: #f60c36;
    }
  }
`
const StyledGavelContainer = styled.div`
  svg {
    height: 30px;
    width: 30px;
    path {
      fill: #fff;
    }
  }
`

const OngoingCasesCard = () => {
  const { drizzle, useCacheCall, useCacheEvents } = useDrizzle()
  const getMetaEvidence = useDataloader.getMetaEvidence()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0] || ZERO_ADDRESS
  }))

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
                if (dispute2) {
                  const metaEvidence = getMetaEvidence(
                    dispute.arbitrated,
                    drizzle.contracts.KlerosLiquid.address,
                    d.returnValues._disputeID
                  )

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
                      acc[vote.voted ? 'active' : 'votePending'].push({
                        ...metaEvidence,
                        statusDiv: (
                          <StyledVoting>
                            Voting <Gavel />
                          </StyledVoting>
                        ),
                        ID: d.returnValues._disputeID
                      })
                    else acc.loading = true
                  } else
                    acc.active.push({
                      ...metaEvidence,
                      statusDiv: (
                        <StyledAppealed>
                          Appealed <Gavel />
                        </StyledAppealed>
                      ),
                      ID: d.returnValues._disputeID
                    })
                } else acc.loading = true
              } else {
                const metaEvidence = getMetaEvidence(
                  dispute.arbitrated,
                  drizzle.contracts.KlerosLiquid.address,
                  d.returnValues._disputeID
                )

                if (dispute.period === '4')
                  acc.executed.push({
                    ...metaEvidence,
                    statusDiv: (
                      <StyledExecuted>
                        Executed <HourGlass />
                      </StyledExecuted>
                    ),
                    ID: d.returnValues._disputeID
                  })
                else
                  acc.active.push({
                    ...metaEvidence,
                    statusDiv: (
                      <StyledPending>
                        Pending <HourGlass />
                      </StyledPending>
                    ),
                    ID: d.returnValues._disputeID
                  })
              }
            else acc.loading = true
            return acc
          },
          { active: [], executed: [], loading: false, votePending: [] }
        )
      : { active: [], executed: [], loading: true, votePending: [] }
  )

  const _allActive = disputes.votePending
    .reverse()
    .concat(disputes.active.reverse())

  return (
    <StyledDiv>
      {_allActive.length > 0 ? (
        <>
          <TitledListCard
            prefix={
              <StyledGavelContainer>
                <Gavel />
              </StyledGavelContainer>
            }
            title="Ongoing Cases"
          />
          <Row>
            {_allActive.slice(0, 3).map((_dispute, i) => (
              <Col key={`case-summary-${i}`} lg={8}>
                <CaseSummaryCard dispute={_dispute} />
              </Col>
            ))}
          </Row>
        </>
      ) : (
        <TitledListCard
          prefix={
            <StyledGavelContainer>
              <Gavel />
            </StyledGavelContainer>
          }
          title="Ongoing Cases"
        >
          <ListItem key="Ongoing-Cases-None">
            You have no ongoing cases
          </ListItem>
        </TitledListCard>
      )}
    </StyledDiv>
  )
}

export default OngoingCasesCard
