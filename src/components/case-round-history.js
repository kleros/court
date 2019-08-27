import { Skeleton, Tabs, Row, Col, Radio } from 'antd'
import React, { Fragment, useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import { useAPI } from '../bootstrap/api'
import { useDataloader } from '../bootstrap/dataloader'

import ScrollBar from './scroll-bar'

const StyledCaseRoundHistory = styled.div`
  height: 550px;

  .ant-row {
    height: 100%;
  }
`
const StyledRadioGroup = styled(Radio.Group)`
  width: 100%;

  .ant-radio-button-wrapper {
    color: #4D00B4;
    margin-left: 10px;
    border: 1px solid #4D00B4 !important;
    border-radius: 300px;
    margin-bottom: 15px;
    text-align: center;
    width: 45%;

    &:before {
      background-color: transparent;
    }

    &-checked {
      background: #4D00B4 !important;
    }
  }
`
const Box = styled.div`
  padding: 21px 43px;
`
const RoundSelectBox = styled(Box)`
  border-bottom: 1px solid #4D00B4;

  h3 {
    color: #4D00B4;
    font-weight: 500;
    font-size: 14px;
    line-height: 16px;
    text-align: center;
    margin-bottom: 14px;
  }
`
const RulingOptionsBox = styled(Box)`
  h3 {
    color: #4D00B4;
    font-weight: 500;
    font-size: 14px;
    line-height: 16px;
    text-align: center;
    margin-bottom: 14px;
  }
`
const JustificationsBox = styled(Box)`
  border-left: 1px solid #4D00B4;
  height: 100%;
  text-align: center;
  h2 {
    font-weight: 500;
    font-size: 24px;
    line-height: 28px;
    margin-bottom: 60px;
    color: #4D00B4;
  }
`
const ScrollBarContainer = styled.div`
  bottom: 40px;
  margin-left: -35px;
  position: absolute;
  width: 95%;

  @media (min-width: 990px) {
    
  }
`

const CaseRoundHistory = ({ ID, dispute, ruling }) => {
  console.log(ruling)
  const { drizzle, useCacheCall } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0]
  }))
  const getMetaEvidence = useDataloader.getMetaEvidence()
  // const dispute = useCacheCall('KlerosLiquid', 'disputes', ID)
  const [ round, setRound ] = useState(ruling ? dispute.votesLengths.length - 1 : null)
  const [ rulingOption, setRulingOption ] = useState(Number(ruling) || 1)
  const [ justificationIndex, setjustificationIndex ] = useState(0)
  console.log(rulingOption)

  let metaEvidence
  if (dispute)
    metaEvidence = getMetaEvidence(
      dispute.arbitrated,
      drizzle.contracts.KlerosLiquid.address,
      ID
    )

  const justifications = dispute.votesLengths.map((_, i) => {
    const _justifications = useAPI.getJustifications(
      drizzle.web3,
      drizzleState.account,
      { appeal: i, disputeID: ID }
    )

    return useCacheCall(['KlerosLiquid'], call => {
      let justifications = { loading: true }
      let disabled = false
      if (metaEvidence && _justifications && _justifications !== 'pending') {
        // Disable round justifications if there are none to show
        if (_justifications.payload.justifications.Items.length === 0)
          disabled = true
        justifications = _justifications.payload.justifications.Items.reduce(
          (acc, j) => {
            const vote = call('KlerosLiquid', 'getVote', ID, i, j.voteID.N)
            if (vote) {
              if (vote.voted)
                acc.byChoice[
                  acc.byChoice.length > vote.choice
                    ? vote.choice
                    : acc.byChoice.length - 1
                ].push(j.justification.S)
            } else acc.loading = true
            return acc
          },
          {
            disabled,
            byChoice: [
              ...new Array(
                2 +
                  ((metaEvidence.metaEvidenceJSON.rulingOptions &&
                    metaEvidence.metaEvidenceJSON.rulingOptions.titles &&
                    metaEvidence.metaEvidenceJSON.rulingOptions.titles.length) ||
                    0)
              )
            ].map(() => []),
            loading: false
          }
        )
      }

      return justifications
    })
  })

  console.log(justifications)

  return (
    <Skeleton active loading={justifications.loading}>
      {!justifications.loading && (
        <StyledCaseRoundHistory>
          <Row>
            <Col md={10}>
              <RoundSelectBox>
                <h3>Round</h3>
                <StyledRadioGroup
                  buttonStyle="solid"
                  name="round"
                  onChange={useCallback(e => setRound(e.target.value), [])}
                  value={round}
                >
                  {
                    justifications.map((round, i) => (
                      <Radio.Button
                        value={i}
                        disabled={round.disabled}
                      >Round {i+1}</Radio.Button>
                    )
                  )}
                </StyledRadioGroup>
              </RoundSelectBox>
              <RulingOptionsBox>
                <h3>Votes</h3>
                  <StyledRadioGroup
                    buttonStyle="solid"
                    name="votes"
                    onChange={useCallback(e => setRulingOption(e.target.value), [])}
                    value={rulingOption}
                  >
                    <Radio.Button
                      value={0}
                    >
                      Refuse to Arbitrate
                    </Radio.Button>
                    {
                      metaEvidence && metaEvidence.metaEvidenceJSON.rulingOptions.titles.map((option, i) => (
                        <Radio.Button
                          value={i+1}
                        >{option}</Radio.Button>
                      )
                    )}
                  </StyledRadioGroup>
              </RulingOptionsBox>
            </Col>
            <Col md={14} style={{height: '100%'}}>
              <JustificationsBox>
                <Skeleton active loading={justifications[round].loading}>
                  <h2>Justification</h2>
                  {
                    !justifications[round].loading && justifications[round].byChoice[rulingOption].length ? (
                      <div>
                        { justifications[round].byChoice[rulingOption][justificationIndex] }
                      </div>
                    ) : (
                      <div>
                        No Justifications for this selection
                      </div>
                    )
                  }
                  {
                    !justifications[round].loading &&
                    <ScrollBarContainer>
                      <ScrollBar
                        currentOption={justificationIndex}
                        numberOfOptions={justifications[round].byChoice[rulingOption].length - 1}
                        setOption={setjustificationIndex}
                      />
                    </ScrollBarContainer>
                  }

                </Skeleton>
              </JustificationsBox>
            </Col>
          </Row>
        </StyledCaseRoundHistory>
      )}
    </Skeleton>
  )
}

CaseRoundHistory.propTypes = {
  ID: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
  round: PropTypes.number.isRequired
}

export default CaseRoundHistory
