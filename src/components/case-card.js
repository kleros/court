import { Button, Card } from 'antd'
import React, { useMemo } from 'react'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import ETHAmount from '../components/eth-amount'
import { ReactComponent as Gavel } from '../assets/images/gavel.svg'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import TimeAgo from '../components/time-ago'
import styled from 'styled-components/macro'
import { useDataloader } from '../bootstrap/dataloader'

const StyledCard = styled(Card)`
  margin: 20px 0 0;

  .ant-card {
    &-head {
      font-size: 14px;
      height: 32px;
      line-height: 32px;
      min-height: 32px;
      padding: 0 19px 0 44px;
      position: relative;

      &-title {
        padding: 0;
      }
    }

    &-extra {
      padding: 0;
    }

    &-body {
      height: 203px;
      padding: 17px 32px 0;
    }

    &-actions {
      border: none;

      & > li {
        border: none;
        height: 44px;
        line-height: 44px;
      }
    }
  }
`
const StyledDiv = styled.div`
  font-weight: bold;
`
const StyledBigTextDiv = styled(StyledDiv)`
  font-size: 16px;
`
const StyledGavel = styled(Gavel)`
  left: 14px;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
`
const StyledCardGrid = styled(Card.Grid)`
  box-shadow: none;
  display: flex;
  flex-direction: column;
  height: 73px;
  justify-content: center;
  margin-bottom: 20px;
  padding: 0 5px;
  text-align: center;
  width: 50%;

  &:first-child {
    border-bottom: 1px solid silver;
    padding-left: 8px;
    text-align: left;
    width: 100%;
  }

  &:nth-child(2) {
    border-right: 1px solid silver;
  }
`
const CaseCard = ({ ID }) => {
  const { drizzle, useCacheCall, useCacheEvents } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0]
  }))
  const getMetaEvidence = useDataloader.getMetaEvidence()
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
      const votesLengths = dispute2.votesLengths.map(drizzle.web3.utils.toBN)
      const jurorAtStake = dispute2.jurorAtStake.map(drizzle.web3.utils.toBN)
      const totalJurorFees = dispute2.totalJurorFees.map(
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
          acc.atStake = acc.atStake.add(votesByAppeal[a].mul(jurorAtStake[a]))
          acc.coherenceReward = acc.coherenceReward.add(
            votesByAppeal[a].div(votesLengths[a]).mul(totalJurorFees[a])
          )
          return acc
        },
        {
          atStake: drizzle.web3.utils.toBN(0),
          coherenceReward: drizzle.web3.utils.toBN(0),
          deadline: undefined
        }
      )
      if (
        dispute &&
        dispute.period !== '4' &&
        votesByAppeal[votesLengths.length - 1]
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
  let metaEvidence
  if (dispute)
    metaEvidence = getMetaEvidence(
      dispute.arbitrated,
      drizzle.contracts.KlerosLiquid.address,
      ID
    )
  return (
    <StyledCard
      actions={useMemo(
        () => [
          disputeData.deadline && (
            <>
              <StyledDiv className="primary-color theme-color">
                Voting Deadline
              </StyledDiv>
              <StyledBigTextDiv className="primary-color theme-color">
                <TimeAgo>{disputeData.deadline}</TimeAgo>
              </StyledBigTextDiv>
            </>
          ),
          <Link to={`/cases/${ID}`}>
            <Button type="primary">See Details</Button>
          </Link>
        ],
        [disputeData.deadline]
      )}
      extra={`Case #${ID}`}
      hoverable
      loading={!metaEvidence}
      title={
        <>
          <StyledGavel className="ternary-fill" />
          {metaEvidence && metaEvidence.metaEvidenceJSON.category}
        </>
      }
    >
      <StyledCardGrid>
        <StyledBigTextDiv>
          {metaEvidence && metaEvidence.metaEvidenceJSON.title}
        </StyledBigTextDiv>
      </StyledCardGrid>
      <StyledCardGrid>
        Coherence Reward
        <StyledBigTextDiv>
          <ETHAmount amount={disputeData.coherenceReward} decimals={2} /> ETH +
        </StyledBigTextDiv>
      </StyledCardGrid>
      <StyledCardGrid>
        Stake Locked
        <StyledBigTextDiv>
          <ETHAmount amount={disputeData.atStake} /> PNK
        </StyledBigTextDiv>
      </StyledCardGrid>
    </StyledCard>
  )
}

CaseCard.propTypes = { ID: PropTypes.string.isRequired }

export default CaseCard
