import { Button, Card } from 'antd'
import React, { useCallback, useMemo } from 'react'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import { ReactComponent as Close } from '../assets/images/close.svg'
import ETHAmount from './eth-amount'
import { ReactComponent as Hexagon } from '../assets/images/hexagon.svg'
import PropTypes from 'prop-types'
import styled from 'styled-components/macro'
import { useDataloader } from '../bootstrap/dataloader'

const StyledCard = styled(Card)`
  margin: 20px 0;
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

  &:first-child {
    border-right: 1px solid silver;
    padding: 8.5px;
  }
`
const StyledDiv = styled.div`
  color: white;
  left: 50%;
  position: absolute;
  top: 45%;
  transform: translate(-50%, -50%);
`
const StyledAmountDiv = styled.div`
  font-weight: bold;
`
const CourtCard = ({ ID, onClick, onStakeClick: _onStakeClick }) => {
  const { useCacheCall } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0]
  }))
  const load = useDataloader()
  let name
  const policy = useCacheCall('PolicyRegistry', 'policies', ID)
  if (policy) {
    const policyJSON = load(policy.fileURI)
    if (policyJSON) name = policyJSON.name
  }
  const stake = useCacheCall(
    'KlerosLiquid',
    'stakeOf',
    drizzleState.account,
    ID
  )
  const subcourt = useCacheCall('KlerosLiquid', 'courts', ID)
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
      extra={<Close />}
      hoverable
      loading={name === undefined}
      onClick={useCallback(() => onClick(ID), [onClick, ID])}
      title={name}
    >
      <StyledCardGrid>
        <Hexagon className="ternary-fill" />
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
          <ETHAmount amount={subcourt && subcourt.jurorFee} decimals={2} /> ETH
          +
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
