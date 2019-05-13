import * as realitioLibQuestionFormatter from '@realitio/realitio-lib/formatters/question'
import {
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Input,
  InputNumber,
  Row,
  Skeleton,
  Spin
} from 'antd'
import React, { useCallback, useMemo, useState } from 'react'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import { API } from '../bootstrap/api'
import Attachment from './attachment'
import Breadcrumbs from './breadcrumbs'
import CaseRoundHistory from './case-round-history'
import CourtDrawer from './court-drawer'
import { ReactComponent as Document } from '../assets/images/document.svg'
import ETHAddress from './eth-address'
import Identicon from './identicon'
import PropTypes from 'prop-types'
import ReactMarkdown from 'react-markdown'
import styled from 'styled-components/macro'
import { useDataloader } from '../bootstrap/dataloader'
import web3Salt from '../temp/web3-salt'

realitioLibQuestionFormatter.minNumber = realitioLibQuestionFormatter.minNumber.bind(
  {
    maxNumber: (...args) => {
      const result = realitioLibQuestionFormatter.maxNumber(...args)
      result.neg = result.negated
      return result
    }
  }
)

const StyledCard = styled(Card)`
  cursor: initial;

  .ant-card {
    &-head {
      margin: 0 46px;
      padding: 0;
      position: relative;

      @media (max-width: 767px) {
        margin: 0 23px;
      }

      &-title {
        font-size: 24px;
      }
    }

    &-body {
      padding: 44px 46px 23px;

      @media (max-width: 767px) {
        padding: 44px 23px 23px;
      }
    }

    &-actions {
      border: none;

      & > li {
        margin: 0;

        & > span {
          cursor: initial;
          display: block;
        }
      }
    }
  }
`
const StyledDiv = styled.div`
  align-items: center;
  color: white;
  display: flex;
  flex-direction: column;
  font-size: 24px;
  padding: 30px 10px;
`
const StyledInputTextArea = styled(Input.TextArea)`
  background: rgba(255, 255, 255, 0.3);
  border: none;
  color: white;
  height: 91px !important;
  margin: 24px 0;
  width: 70%;
`
const StyledButtonsDiv = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  width: 70%;

  &:first-child {
    margin-top: 20px;
  }

  .ant-checkbox-group-item.ant-checkbox-wrapper span {
    color: white;
  }
`
const StyledButton = styled(Button)`
  flex: 0 0 35%;
  margin: 20px 5px 15px;
`
const StyledPoliciesButton = styled(Button)`
  padding-left: 40px;
  position: relative;
`
const StyledDocument = styled(Document)`
  height: 18px;
  left: 17px;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: auto;
`
const StyledBreadcrumbs = styled(Breadcrumbs)`
  bottom: -20px;
  font-size: 10px;
  left: 0;
  position: absolute;
`
const StyledInnerCard = styled(Card)`
  cursor: initial;
  margin-bottom: 38px;

  .ant-card {
    &-head {
      margin: 0 21px 0 17px;
      padding: 0;

      &-title {
        align-items: center;
        display: flex;
        font-size: 18px;
      }
    }

    &-body {
      padding: 21px 20px 42px;
    }

    &-actions {
      background: linear-gradient(228.49deg, white -6.48%, whitesmoke 45.52%);
      border: none;
      padding-left: 20px;
      position: relative;

      & > li {
        border: none;
        margin: 12px 8px;
        width: auto !important;

        &:last-child {
          left: 0;
          position: absolute;
          top: 0;
        }

        /* stylelint-disable-next-line no-descending-specificity */
        & > span {
          display: inline-block;
        }
      }
    }
  }
`
const StyledIFrame = styled.iframe`
  height: 215px;
  width: 100%;
`
const StyledInnerCardActionsTitleDiv = styled.div`
  background: whitesmoke;
  border-radius: 6px 6px 0 0;
  height: 28px;
  left: 20px;
  line-height: 28px;
  position: absolute;
  text-align: center;
  top: -55px;
  width: 167px;
`
const StyledIdenticon = styled(Identicon)`
  margin-right: 10px;
`
const CaseDetailsCard = ({ ID }) => {
  const { drizzle, useCacheCall, useCacheEvents, useCacheSend } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0]
  }))
  const loadPolicy = useDataloader.loadPolicy()
  const getMetaEvidence = useDataloader.getMetaEvidence()
  const getEvidence = useDataloader.getEvidence()
  const [activeSubcourtID, setActiveSubcourtID] = useState()
  const [justification, setJustification] = useState()
  const [complexRuling, setComplexRuling] = useState()
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
  const votesData = useCacheCall(['KlerosLiquid'], call => {
    let votesData = { loading: true }
    const currentRuling = call('KlerosLiquid', 'currentRuling', ID)
    if (dispute && dispute2 && draws) {
      const drawnInCurrentRound =
        draws.length > 0 &&
        Number(draws[draws.length - 1].returnValues._appeal) ===
          dispute2.votesLengths.length - 1
      const vote =
        drawnInCurrentRound &&
        call(
          'KlerosLiquid',
          'getVote',
          ID,
          draws[draws.length - 1].returnValues._appeal,
          draws[draws.length - 1].returnValues._voteID
        )
      const subcourt =
        drawnInCurrentRound &&
        call('KlerosLiquid', 'courts', dispute.subcourtID)
      if (!drawnInCurrentRound || (vote && subcourt)) {
        const committed =
          drawnInCurrentRound &&
          vote.commit !==
            '0x0000000000000000000000000000000000000000000000000000000000000000'
        votesData = draws.reduce(
          (acc, d) => {
            if (
              Number(d.returnValues._appeal) ===
              dispute2.votesLengths.length - 1
            )
              acc.voteIDs.push(d.returnValues._voteID)
            return acc
          },
          {
            canVote:
              drawnInCurrentRound &&
              ((dispute.period === '1' && !committed) ||
                (dispute.period === '2' &&
                  (!subcourt.hiddenVotes || committed) &&
                  !vote.voted)),
            committed,
            currentRuling,
            drawnInCurrentRound,
            loading: !currentRuling,
            voteIDs: [],
            voted: vote.voted && vote.choice
          }
        )
      }
    }
    return votesData
  })
  const subcourts = useCacheCall(['PolicyRegistry', 'KlerosLiquid'], call => {
    if (dispute) {
      const subcourts = []
      let nextID = dispute.subcourtID
      while (
        !subcourts.length ||
        subcourts[subcourts.length - 1].ID !== nextID
      ) {
        const subcourt = {
          ID: nextID,
          hiddenVotes: undefined,
          name: undefined
        }
        const policy = call('PolicyRegistry', 'policies', subcourt.ID)
        if (policy !== undefined) {
          const policyJSON = loadPolicy(policy)
          if (policyJSON) subcourt.name = policyJSON.name
        }
        const _subcourt = call('KlerosLiquid', 'courts', subcourt.ID)
        if (_subcourt) {
          nextID = _subcourt.parent
          subcourt.hiddenVotes = _subcourt.hiddenVotes
        }
        if (subcourt.name === undefined || !_subcourt) return undefined
        subcourts.push(subcourt)
      }
      return subcourts.reverse()
    }
  })
  let metaEvidence
  let evidence
  let evidenceBySubmitter
  if (dispute) {
    metaEvidence = getMetaEvidence(
      dispute.arbitrated,
      drizzle.contracts.KlerosLiquid.address,
      ID
    )
    evidence = getEvidence(
      dispute.arbitrated,
      drizzle.contracts.KlerosLiquid.address,
      ID
    )
    if (evidence)
      evidenceBySubmitter = evidence.reduce((acc, e) => {
        if (acc[e.submittedBy]) acc[e.submittedBy].push(e)
        else acc[e.submittedBy] = [e]
        return acc
      }, {})
  }
  const { send: sendCommit, status: sendCommitStatus } = useCacheSend(
    'KlerosLiquid',
    'castCommit'
  )
  const { send: sendVote, status: sendVoteStatus } = useCacheSend(
    'KlerosLiquid',
    'castVote'
  )
  const onJustificationChange = useCallback(
    ({ currentTarget: { value } }) => setJustification(value),
    []
  )
  const disabledDate = useCallback(
    date =>
      realitioLibQuestionFormatter
        .maxNumber({
          decimals: metaEvidence.metaEvidenceJSON.rulingOptions.precision,
          type: metaEvidence.metaEvidenceJSON.rulingOptions.type
        })
        .lte(date.unix() + 1),
    [
      metaEvidence &&
        metaEvidence.metaEvidenceJSON.rulingOptions &&
        metaEvidence.metaEvidenceJSON.rulingOptions.precision,
      metaEvidence &&
        metaEvidence.metaEvidenceJSON.rulingOptions &&
        metaEvidence.metaEvidenceJSON.rulingOptions.type
    ]
  )
  const onVoteClick = useCallback(
    async ({ currentTarget: { id } }) => {
      let choice
      const typeSwitch =
        id !== '0' &&
        metaEvidence.metaEvidenceJSON.rulingOptions &&
        metaEvidence.metaEvidenceJSON.rulingOptions.type
      switch (typeSwitch) {
        case 'multiple-select':
          choice = metaEvidence.metaEvidenceJSON.rulingOptions.titles
            ? metaEvidence.metaEvidenceJSON.rulingOptions.titles.map(t =>
                complexRuling.includes(t)
              )
            : []
          break
        case 'datetime':
          choice = complexRuling.unix()
          break
        case 'uint':
          choice = complexRuling
          break
        default:
          choice = id
          break
      }
      switch (typeSwitch) {
        case 'multiple-select':
        case 'datetime':
        case 'uint':
          choice = realitioLibQuestionFormatter.answerToBytes32(choice, {
            decimals: metaEvidence.metaEvidenceJSON.rulingOptions.precision,
            type: metaEvidence.metaEvidenceJSON.rulingOptions.type
          })
          choice = realitioLibQuestionFormatter.padToBytes32(
            drizzle.web3.utils
              .toBN(choice)
              .add(drizzle.web3.utils.toBN('1'))
              .toString(16)
          )
          break
        default:
          break
      }
      if (dispute.period === '1')
        sendCommit(
          ID,
          votesData.voteIDs,
          drizzle.web3.utils.soliditySha3(
            choice,
            await web3Salt(
              drizzle.web3,
              drizzleState.account,
              'Kleros Court Commit',
              ID,
              dispute2.votesLengths.length - 1
            )
          )
        )
      else {
        sendVote(
          ID,
          votesData.voteIDs,
          choice,
          subcourts[subcourts.length - 1].hiddenVotes
            ? await web3Salt(
                drizzle.web3,
                drizzleState.account,
                'Kleros Court Commit',
                ID,
                dispute2.votesLengths.length - 1
              )
            : 0
        )
        API.putJustifications(drizzle.web3, drizzleState.account, {
          appeal: dispute2.votesLengths.length - 1,
          disputeID: ID,
          justification,
          voteIDs: votesData.voteIDs
        })
      }
    },
    [
      metaEvidence,
      complexRuling,
      dispute && dispute.period,
      ID,
      votesData.voteIDs,
      drizzle.web3,
      drizzleState.account,
      dispute2 && dispute2.votesLengths.length,
      subcourts && subcourts[subcourts.length - 1].hiddenVotes,
      justification
    ]
  )
  const metaEvidenceActions = useMemo(() => {
    if (metaEvidence) {
      const actions = []
      if (metaEvidence.metaEvidenceJSON.fileURI)
        actions.push(
          <Attachment
            URI={metaEvidence.metaEvidenceJSON.fileURI}
            description="This is the primary file uploaded with the dispute."
            extension={metaEvidence.metaEvidenceJSON.fileTypeExtension}
            title="Main File"
          />
        )
      actions.push(
        <StyledInnerCardActionsTitleDiv className="ternary-color theme-color">
          Primary Documents
        </StyledInnerCardActionsTitleDiv>
      )
      return actions
    }
  }, [metaEvidence])
  return (
    <StyledCard
      actions={useMemo(() => [
        <Spin
          spinning={
            votesData.loading ||
            !subcourts ||
            !metaEvidence ||
            sendCommitStatus === 'pending' ||
            sendVoteStatus === 'pending'
          }
        >
          {!votesData.loading && subcourts && metaEvidence ? (
            <>
              <StyledDiv className="secondary-linear-background theme-linear-background">
                {votesData.drawnInCurrentRound
                  ? votesData.canVote
                    ? 'What is your verdict?'
                    : votesData.voted
                    ? `You chose: ${
                        votesData.voted === '0'
                          ? 'Refuse to Arbitrate'
                          : (metaEvidence.metaEvidenceJSON.rulingOptions &&
                              realitioLibQuestionFormatter.getAnswerString(
                                {
                                  decimals:
                                    metaEvidence.metaEvidenceJSON.rulingOptions
                                      .precision,
                                  outcomes:
                                    metaEvidence.metaEvidenceJSON.rulingOptions
                                      .titles,
                                  type:
                                    metaEvidence.metaEvidenceJSON.rulingOptions
                                      .type
                                },
                                realitioLibQuestionFormatter.padToBytes32(
                                  drizzle.web3.utils
                                    .toBN(votesData.voted)
                                    .sub(drizzle.web3.utils.toBN('1'))
                                    .toString(16)
                                )
                              )) ||
                            'Unknown Choice'
                      }.`
                    : dispute.period === '0'
                    ? 'Waiting for evidence.'
                    : dispute.period === '1'
                    ? 'Waiting to reveal your vote.'
                    : subcourts[subcourts.length - 1].hiddenVotes
                    ? votesData.committed
                      ? 'You did not reveal your vote.'
                      : 'You did not commit a vote.'
                    : 'You did not cast a vote.'
                  : 'You were not drawn in the current round.'}
                {dispute.period === '4' &&
                  ` The winning choice was "${
                    votesData.currentRuling === '0'
                      ? 'Refuse to Arbitrate'
                      : (metaEvidence.metaEvidenceJSON.rulingOptions &&
                          realitioLibQuestionFormatter.getAnswerString(
                            {
                              decimals:
                                metaEvidence.metaEvidenceJSON.rulingOptions
                                  .precision,
                              outcomes:
                                metaEvidence.metaEvidenceJSON.rulingOptions
                                  .titles,
                              type:
                                metaEvidence.metaEvidenceJSON.rulingOptions.type
                            },
                            realitioLibQuestionFormatter.padToBytes32(
                              drizzle.web3.utils
                                .toBN(votesData.currentRuling)
                                .sub(drizzle.web3.utils.toBN('1'))
                                .toString(16)
                            )
                          )) ||
                        'Unknown Choice'
                  }".`}
                {votesData.canVote && dispute.period === '2' && (
                  <StyledInputTextArea
                    onChange={onJustificationChange}
                    placeholder="Justify your vote here..."
                    value={justification}
                  />
                )}
                {metaEvidence.metaEvidenceJSON.rulingOptions && (
                  <>
                    {metaEvidence.metaEvidenceJSON.rulingOptions.type !==
                      'single-select' && (
                      <StyledButtonsDiv>
                        {metaEvidence.metaEvidenceJSON.rulingOptions.type ===
                        'multiple-select' ? (
                          <Checkbox.Group
                            disabled={!votesData.canVote}
                            name="ruling"
                            onChange={setComplexRuling}
                            options={
                              metaEvidence.metaEvidenceJSON.rulingOptions
                                .titles &&
                              metaEvidence.metaEvidenceJSON.rulingOptions.titles.slice(
                                0,
                                255
                              )
                            }
                            value={complexRuling}
                          />
                        ) : metaEvidence.metaEvidenceJSON.rulingOptions.type ===
                          'datetime' ? (
                          <DatePicker
                            disabled={!votesData.canVote}
                            disabledDate={disabledDate}
                            onChange={setComplexRuling}
                            showTime
                            size="large"
                            value={complexRuling}
                          />
                        ) : (
                          <InputNumber
                            disabled={!votesData.canVote}
                            max={Number(
                              realitioLibQuestionFormatter
                                .maxNumber({
                                  decimals:
                                    metaEvidence.metaEvidenceJSON.rulingOptions
                                      .precision,
                                  type:
                                    metaEvidence.metaEvidenceJSON.rulingOptions
                                      .type
                                })
                                .minus(1)
                            )}
                            min={Number(
                              realitioLibQuestionFormatter.minNumber({
                                decimals:
                                  metaEvidence.metaEvidenceJSON.rulingOptions
                                    .precision,
                                type:
                                  metaEvidence.metaEvidenceJSON.rulingOptions
                                    .type
                              })
                            )}
                            onChange={setComplexRuling}
                            precision={
                              metaEvidence.metaEvidenceJSON.rulingOptions
                                .precision
                            }
                            size="large"
                            value={complexRuling}
                          />
                        )}
                      </StyledButtonsDiv>
                    )}
                    <StyledButtonsDiv>
                      {metaEvidence.metaEvidenceJSON.rulingOptions.type ===
                      'single-select' ? (
                        metaEvidence.metaEvidenceJSON.rulingOptions.titles &&
                        metaEvidence.metaEvidenceJSON.rulingOptions.titles
                          .slice(0, 2 ** 256 - 1)
                          .map((t, i) => (
                            <StyledButton
                              disabled={!votesData.canVote}
                              id={i + 1}
                              key={t}
                              onClick={onVoteClick}
                              size="large"
                              type="primary"
                            >
                              {t}
                            </StyledButton>
                          ))
                      ) : (
                        <StyledButton
                          disabled={!votesData.canVote || !complexRuling}
                          onClick={onVoteClick}
                          size="large"
                          type="primary"
                        >
                          Submit
                        </StyledButton>
                      )}
                    </StyledButtonsDiv>
                  </>
                )}
              </StyledDiv>
              <StyledDiv className="secondary-background theme-background">
                <Button
                  disabled={!votesData.canVote}
                  ghost={votesData.canVote}
                  id={0}
                  onClick={onVoteClick}
                  size="large"
                >
                  Refuse to Arbitrate
                </Button>
              </StyledDiv>
            </>
          ) : (
            <StyledDiv className="secondary-linear-background theme-linear-background" />
          )}
        </Spin>
      ])}
      extra={
        <StyledPoliciesButton
          onClick={useCallback(
            () => dispute && setActiveSubcourtID(dispute.subcourtID),
            [dispute && dispute.subcourtID]
          )}
        >
          <StyledDocument /> Policies
        </StyledPoliciesButton>
      }
      hoverable
      loading={!metaEvidence}
      title={
        <>
          {metaEvidence && metaEvidence.metaEvidenceJSON.title}
          {subcourts && (
            <StyledBreadcrumbs breadcrumbs={subcourts.map(s => s.name)} />
          )}
        </>
      }
    >
      {metaEvidence && (
        <>
          <Row>
            <Col span={24}>
              <StyledInnerCard actions={metaEvidenceActions} hoverable>
                <ReactMarkdown
                  source={metaEvidence.metaEvidenceJSON.description}
                />
                {metaEvidence.metaEvidenceJSON.evidenceDisplayInterfaceURI && (
                  <StyledIFrame
                    frameBorder="0"
                    src={`${metaEvidence.metaEvidenceJSON.evidenceDisplayInterfaceURI.replace(
                      /^\/ipfs\//,
                      'https://ipfs.kleros.io/ipfs/'
                    )}?${encodeURIComponent(
                      JSON.stringify({
                        arbitrableContractAddress: dispute.arbitrated,
                        arbitratorContractAddress:
                          drizzle.contracts.KlerosLiquid.address,
                        disputeID: ID
                      })
                    )}`}
                    title="MetaEvidence Display"
                  />
                )}
              </StyledInnerCard>
            </Col>
          </Row>
          <Skeleton active loading={!evidence} title={false}>
            {evidence && (
              <Row gutter={40}>
                {Object.keys(evidenceBySubmitter).map(a => (
                  <Col key={a} md={12}>
                    <StyledInnerCard
                      actions={evidenceBySubmitter[a]
                        .map(e => (
                          <Attachment
                            URI={e.evidenceJSON.fileURI}
                            description={e.evidenceJSON.description}
                            extension={e.evidenceJSON.fileTypeExtension}
                            title={e.evidenceJSON.name}
                          />
                        ))
                        .concat(
                          <StyledInnerCardActionsTitleDiv className="ternary-color theme-color">
                            Evidence
                          </StyledInnerCardActionsTitleDiv>
                        )}
                      hoverable
                      title={
                        <>
                          <StyledIdenticon account={a} />
                          {(metaEvidence.metaEvidenceJSON.aliases &&
                            metaEvidence.metaEvidenceJSON.aliases[a]) || (
                            <ETHAddress address={a} />
                          )}
                        </>
                      }
                    />
                  </Col>
                ))}
              </Row>
            )}
          </Skeleton>
          <Divider>History</Divider>
          {dispute2 &&
            dispute2.votesLengths.map((_, i) => (
              <CaseRoundHistory
                ID={ID}
                disabled={
                  dispute.period !== '4' &&
                  i === dispute2.votesLengths.length - 1
                }
                key={i}
                round={i}
              />
            ))}
        </>
      )}
      {activeSubcourtID !== undefined && (
        <CourtDrawer ID={activeSubcourtID} onClose={setActiveSubcourtID} />
      )}
    </StyledCard>
  )
}

CaseDetailsCard.propTypes = {
  ID: PropTypes.string.isRequired
}

export default CaseDetailsCard
