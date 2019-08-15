import { Button, Card, Popconfirm, Row, Col } from 'antd'
import React, { useCallback, useMemo } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components/macro'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import { ReactComponent as Close } from '../assets/images/close.svg'
import { ReactComponent as Hexagon } from '../assets/images/hexagon.svg'
import { ReactComponent as Scales } from '../assets/images/scales.svg'
import { useDataloader } from '../bootstrap/dataloader'
import rewardImg from '../assets/images/reward.png'

import ETHAmount from './eth-amount'

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0px 6px 36px #BC9CFF;
  margin: 20px 0 0;
  text-align: center;

  .ant-card-actions {
    border: none;

    & > li {
      border: none;
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
const StyledHexagon = styled(Hexagon)`
  height: 81px;
  width: 71px;
`
const StyledDiv = styled.div`
  color: white;
  left: 50%;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
`
const StyledAmountDiv = styled.div`
  font-weight: bold;
`
const StyledPrefixDiv = styled.div`
  left: 29px;
  position: absolute;
  top: 29px;
  transform: translate(-50%, -50%);
`
const InfoBox = styled.div`
  border: 2px solid #D09CFF;
  border-radius: 12px;
  height: 88px;
  margin-bottom: 8px;
`
const StakeBox = styled(InfoBox)`
  background: #F5F1FD;
`
const RewardBox = styled(InfoBox)`
  background: linear-gradient(111.05deg, #4D00B4 45.17%, #6500B4 88.53%);
`
const CourtCard = ({ ID, onClick, onStakeClick: _onStakeClick }) => {
  const { drizzle, useCacheCall, useCacheSend } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0]
  }))
  const loadPolicy = useDataloader.loadPolicy()
  let name
  const policy = useCacheCall('PolicyRegistry', 'policies', ID)
  if (policy !== undefined) {
    const policyJSON = loadPolicy(policy)
    if (policyJSON) name = policyJSON.name
  }
  const stake = useCacheCall(
    'KlerosLiquidExtraViews',
    'stakeOf',
    drizzleState.account,
    ID
  )
  const subcourt = useCacheCall('KlerosLiquid', 'courts', ID)
  const { send, status } = useCacheSend('KlerosLiquid', 'setStake')
  const onStakeClick = useCallback(
    e => {
      e.stopPropagation()
      _onStakeClick(ID)
    },
    [_onStakeClick, ID]
  )
  return (
    <StyledCard
      actions={useMemo(
        () => [
          <Button onClick={onStakeClick} size="large" type="primary">
            Stake
          </Button>
        ],
        []
      )}
      hoverable
      loading={name === undefined || (status && status !== 'error')}
      onClick={useCallback(() => onClick(ID), [onClick, ID])}
      title={(
        <>
          <Scales style={{marginRight: '5px'}}/>
          {name}
        </>
      )}
    >
      <StyledBody>
        <StakeBox>
          <Row>
            <Col md={8}>
              <Hexagon className="ternary-fill" />
              <StyledPrefixDiv style={{top: '33px'}}>
                <img src={rewardImg} />
              </StyledPrefixDiv>
            </Col>
            <Col md={16}>
              <div>Current Stake</div>
              <div>
                {subcourt && drizzle.web3.utils.fromWei(subcourt.feeForJuror).toString()} ETH +
              </div>
            </Col>
          </Row>
        </StakeBox>
        <RewardBox>
          <Row>
            <Col md={8}>
              <Hexagon className="ternary-fill" />
              <StyledPrefixDiv style={{top: '33px'}}>
                <img src={rewardImg} />
              </StyledPrefixDiv>
            </Col>
            <Col md={16}>
              <div>Coherence Reward</div>
              <div>
                {subcourt && drizzle.web3.utils.fromWei(subcourt.feeForJuror).toString()} ETH +
              </div>
            </Col>
          </Row>
        </RewardBox>
      </StyledBody>
    </StyledCard>
  )
}

CourtCard.propTypes = {
  ID: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  onStakeClick: PropTypes.func.isRequired
}

export default CourtCard
