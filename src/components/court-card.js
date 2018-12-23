import { Button, Card } from 'antd'
import React, { useMemo } from 'react'
import { ReactComponent as Close } from '../assets/images/close.svg'
import { ReactComponent as Hexagon } from '../assets/images/hexagon.svg'
import PropTypes from 'prop-types'
import styled from 'styled-components/macro'

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
const CourtCard = ({ ID }) => {
  console.log(ID)
  return (
    <StyledCard
      actions={useMemo(
        () => [
          <Button size="large">Unstake</Button>,
          <Button size="large" type="primary">
            Stake
          </Button>
        ],
        []
      )}
      extra={<Close />}
      hoverable
      loading={false}
      title="Air Transport"
    >
      <StyledCardGrid>
        <Hexagon className="ternary-fill" />
        <StyledDiv>
          <StyledAmountDiv>0</StyledAmountDiv>PNK
        </StyledDiv>
      </StyledCardGrid>
      <StyledCardGrid>
        Min Stake<StyledAmountDiv>350 PNK</StyledAmountDiv>
      </StyledCardGrid>
      <StyledCardGrid>
        Coherence Reward<StyledAmountDiv>0.01 ETH +</StyledAmountDiv>
      </StyledCardGrid>
      <StyledCardGrid>
        Stake Locked Per Vote<StyledAmountDiv>200 PNK</StyledAmountDiv>
      </StyledCardGrid>
    </StyledCard>
  )
}

CourtCard.propTypes = {
  ID: PropTypes.number.isRequired
}

export default CourtCard
