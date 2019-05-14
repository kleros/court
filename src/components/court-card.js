import { Button, Card, Popconfirm } from 'antd'
import React, { useCallback, useMemo } from 'react'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import { ReactComponent as Close } from '../assets/images/close.svg'
import ETHAmount from './eth-amount'
import { ReactComponent as Hexagon } from '../assets/images/hexagon.svg'
import PropTypes from 'prop-types'
import styled from 'styled-components/macro'
import { useDataloader } from '../bootstrap/dataloader'

const StyledCard = styled(Card)`
  margin: 20px 0 0;
  text-align: center;

  .ant-card-actions {
    border: none;

    & > li {
      border: none;
    }
  }
`
const StyledCardGrid = styled(Card.Grid)`
  box-shadow: none;
  position: relative;
  width: 50%;

  @media (max-width: 767px) {
    border-right: none !important;
    padding: 8.5px;
    width: 100%;
  }

  &:first-child {
    border-right: 1px solid silver;
    padding: 3px 0 0;
  }
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
const CourtCard = ({ ID, onClick, onStakeClick: _onStakeClick }) => {
  const { useCacheCall, useCacheSend } = useDrizzle()
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
      extra={
        <Popconfirm
          cancelText="No"
          okText="Yes"
          onClick={useCallback(e => e.stopPropagation(), [])}
          onConfirm={useCallback(
            e => {
              e.stopPropagation()
              send(ID, 0)
            },
            [ID]
          )}
          title="Unstake all of your PNK from this court?"
        >
          <Close />
        </Popconfirm>
      }
      hoverable
      loading={name === undefined || (status && status !== 'error')}
      onClick={useCallback(() => onClick(ID), [onClick, ID])}
      title={name}
    >
      <StyledCardGrid>
        <StyledHexagon className="ternary-fill" />
        <StyledDiv>
          <StyledAmountDiv>
            <ETHAmount amount={stake} />
          </StyledAmountDiv>
          PNK
        </StyledDiv>
      </StyledCardGrid>
      <StyledCardGrid>
        Min Stake
        <StyledAmountDiv>
          <ETHAmount amount={subcourt && subcourt.minStake} /> PNK
        </StyledAmountDiv>
      </StyledCardGrid>
      <StyledCardGrid>
        Coherence Reward
        <StyledAmountDiv>
          <ETHAmount amount={subcourt && subcourt.feeForJuror} decimals={2} />{' '}
          ETH +
        </StyledAmountDiv>
      </StyledCardGrid>
      <StyledCardGrid>
        Stake Locked/Vote
        <StyledAmountDiv>
          <ETHAmount
            amount={subcourt && (subcourt.minStake * subcourt.alpha) / 10000}
          />{' '}
          PNK
        </StyledAmountDiv>
      </StyledCardGrid>
    </StyledCard>
  )
}

CourtCard.propTypes = {
  ID: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  onStakeClick: PropTypes.func.isRequired
}

export default CourtCard
