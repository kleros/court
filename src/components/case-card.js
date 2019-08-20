import { Button, Card, Popconfirm, Row, Col } from 'antd'
import React, { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import TimeAgo from './time-ago'
import styled from 'styled-components/macro'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import { ReactComponent as Close } from '../assets/images/close.svg'
import { ReactComponent as Hexagon } from '../assets/images/hexagon.svg'
import { ReactComponent as Scales } from '../assets/images/scales.svg'
import { useDataloader } from '../bootstrap/dataloader'
import rewardImg from '../assets/images/reward.png'
import stakeImg from '../assets/images/stake-kleros-logo.png'
import Hint from '../components/hint'

import ETHAmount from './eth-amount'

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0px 6px 36px #BC9CFF;
  margin: 20px 0 0;
  text-align: center;

  .ant-card-actions {
    background: #F5F1FD;
    border: none;
    padding: 12px 24px;

    & > li {
      border: none;
    }

    & > li:first-child {
      span {
        float: left;
      }
    }
    & > li:nth-child(2) {
      span {
        float: right;
      }
    }

    button {
      font-size: 14px;
      min-width: 110px;
      height: 40px;
    }

    .unstake-button {
      background: none;
      border: 1px solid #4D00B4;
      border-radius: 3px;
      color: #4D00B4;
    }
  }

  .ant-card-head {
    height: 40px;
    background: #4D00B4;
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
    text-align: left;
    color: white;
  }
`
const StyledBody = styled.div`
`
const StyledDiv = styled.div`
  color: white;
  left: 50%;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
`
const StyledPrefixDiv = styled.div`
  left: 50%;
  position: absolute;
  top: 33px;
  transform: translate(-50%, -50%);
`
const IconCol = styled(Col)`
  margin-top: 10px;
`
const RewardCol = styled(Col)`
  margin-top: 16px;
  color: white;
  font-size: 14px;
  text-align: left;

  h3 {
    color: white;
    font-size: 24px;
    font-weight: 600;
  }
`
const InfoBox = styled.div`
  border: 2px solid #D09CFF;
  border-radius: 12px;
  height: 88px;
  margin-bottom: 8px;
`
const CaseTitleBox = styled.div`
  font-weight: 500;
  font-size: 20px;
  line-height: 23px;
  color: #000000;
  height: 65px;
`
const RewardBox = styled(InfoBox)`
  background: linear-gradient(111.05deg, #4D00B4 45.17%, #6500B4 88.53%);
`
const StyledBigTextDiv = styled(StyledDiv)`
  font-size: 16px;
`
const StyledHeaderText = styled.div`
  display: inline-block;
  font-weight: 500;
  font-size: 14px;
  line-height: 16px;
  position: relative;
  top: -2px;
  color: #FFFFFF;
`
const TimeoutDiv = styled.div`
  color: #F60C36;
`
const TimeoutText = styled.div`
  font-weight: 500;
  font-size: 14px;
  line-height: 16px;
  text-align: right;
`
const TimeoutTime = styled.div`
  font-weight: bold;
  font-size: 20px;
  line-height: 23px;
  text-align: center;
`
const StakeLocked = styled.div`
  font-size: 14px;
  line-height: 16px;
  text-align: right;
  color: #4D00B4;
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
        fromBlock: process.env.REACT_APP_DRAW_EVENT_LISTENER_BLOCK_NUMBER
      }),
      [drizzleState.account, ID]
    )
  )
  const disputeData = useCacheCall(['KlerosLiquid'], call => {
    let disputeData = {}
    if (dispute2 && draws) {
      const votesLengths = dispute2.votesLengths.map(drizzle.web3.utils.toBN)
      const tokensAtStakePerJuror = dispute2.tokensAtStakePerJuror.map(
        drizzle.web3.utils.toBN
      )
      const totalFeesForJurors = dispute2.totalFeesForJurors.map(
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
          acc.coherenceReward = acc.coherenceReward.add(
            votesByAppeal[a].mul(totalFeesForJurors[a]).div(votesLengths[a])
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
            <TimeoutDiv>
              <TimeoutText>
                {
                  ['Evidence Submission Over', 'Commit Deadline', 'Voting Deadline', 'Appeal Deadline', 'Execute Deadline'][
                    dispute.period
                  ]
                }
              </TimeoutText>
              <TimeoutTime>
                <TimeAgo>{disputeData.deadline}</TimeAgo>
              </TimeoutTime>
            </TimeoutDiv>
          ),
          <Link to={`/cases/${ID}`}>
            <Button type="primary">See Details</Button>
          </Link>
        ],
        [disputeData.deadline]
      )}
      hoverable
      loading={!metaEvidence}
      title={(
        <>
          <Scales style={{marginRight: '5px'}}/>
          <StyledHeaderText>{metaEvidence && metaEvidence.metaEvidenceJSON.category}</StyledHeaderText>
        </>
      )}
      extra={(
        <StyledHeaderText>
          Case #{ID}
        </StyledHeaderText>
      )}
    >
      <StyledBody>
        <CaseTitleBox>
          {metaEvidence && metaEvidence.metaEvidenceJSON.title}
        </CaseTitleBox>
        <RewardBox>
          <Row>
            <IconCol md={8}>
              <Hexagon className="ternary-fill" />
              <StyledPrefixDiv>
                <img src={rewardImg} />
              </StyledPrefixDiv>
            </IconCol>
            <RewardCol md={16}>
              <div>Coherence Reward</div>
              <h3>
                {disputeData.coherenceReward &&
                  Number(drizzle.web3.utils.fromWei(disputeData.coherenceReward).toString()).toFixed(2)
                } ETH +
              </h3>
            </RewardCol>
          </Row>
        </RewardBox>
        <StakeLocked>
          Stake locked: {disputeData.atStake &&
            Number(drizzle.web3.utils.fromWei(disputeData.atStake).toString()).toFixed(0)
          } PNK {' '}
          <Hint
            description="These are the tokens you have locked for the duration of the dispute."
          />
        </StakeLocked>
      </StyledBody>
    </StyledCard>
  )
}

CaseCard.propTypes = { ID: PropTypes.string.isRequired }

export default CaseCard
