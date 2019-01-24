import { Button, Card, Col, Input, Row, Skeleton, Spin } from 'antd'
import React, { useCallback, useMemo, useState } from 'react'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import Attachment from '../components/attachment'
import Breadcrumbs from '../components/breadcrumbs'
import CourtDrawer from '../components/court-drawer'
import { ReactComponent as Document } from '../assets/images/document.svg'
import Identicon from '../components/identicon'
import PropTypes from 'prop-types'
import styled from 'styled-components/macro'
import { useDataloader } from '../bootstrap/dataloader'

const StyledCard = styled(Card)`
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

        & > span {
          display: inline-block;
        }
      }
    }
  }
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
  const load = useDataloader.load()
  const getMetaEvidence = useDataloader.getMetaEvidence()
  const getEvidence = useDataloader.getEvidence()
  const [activeSubcourtID, setActiveSubcourtID] = useState()
  const [justification, setJustification] = useState()
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
  const votesData = useCacheCall(['KlerosLiquid'], call => {
    let votesData = { loading: true }
    if (draws) {
      const vote = call(
        'KlerosLiquid',
        'getVote',
        ID,
        draws[draws.length - 1].returnValues._appeal,
        draws[draws.length - 1].returnValues._voteID
      )
      if (dispute2 && vote)
        votesData = draws.reduce(
          (acc, d) => {
            if (
              Number(d.returnValues._appeal) ===
              dispute2.votesLengths.length - 1
            ) {
              acc.canVote = acc.canVote && true
              acc.voteIDs.push(d.returnValues._voteID)
            }
            return acc
          },
          {
            canVote: !vote.voted,
            loading: false,
            voteIDs: [],
            voted: vote.voted && vote.choice
          }
        )
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
          name: undefined
        }
        const policy = call('PolicyRegistry', 'policies', subcourt.ID)
        if (policy !== undefined) {
          const policyJSON = load(policy)
          if (policyJSON) subcourt.name = policyJSON.name
        }
        const _subcourt = call('KlerosLiquid', 'courts', subcourt.ID)
        if (_subcourt) nextID = _subcourt.parent
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
  const { send, status } = useCacheSend('KlerosLiquid', 'vote')
  const onJustificationChange = useCallback(
    ({ currentTarget: { value } }) => setJustification(value),
    []
  )
  const onVoteClick = useCallback(
    ({ currentTarget: { id } }) => send(ID, votesData.voteIDs, id, 0),
    [ID, votesData.voteIDs]
  )
  return (
    <StyledCard
      actions={useMemo(
        () => [
          <Spin
            spinning={
              votesData.loading || !metaEvidence || status === 'pending'
            }
          >
            {!votesData.loading && metaEvidence ? (
              <>
                <StyledDiv className="secondary-linear-background theme-linear-background">
                  {votesData.canVote
                    ? 'What is your verdict?'
                    : votesData.voted
                    ? `You chose: ${metaEvidence.metaEvidenceJSON.rulingOptions
                        .titles[votesData.voted - 1] || 'Refuse to Arbitrate'}.`
                    : 'You did not cast a vote.'}
                  {votesData.canVote && (
                    <StyledInputTextArea
                      onChange={onJustificationChange}
                      placeholder="Justify your vote here..."
                      value={justification}
                    />
                  )}
                  <StyledButtonsDiv>
                    {metaEvidence.metaEvidenceJSON.rulingOptions.titles.map(
                      (t, i) => (
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
                      )
                    )}
                  </StyledButtonsDiv>
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
        ],
        [
          votesData.canVote,
          votesData.loading,
          votesData.voted,
          metaEvidence,
          justification
        ]
      )}
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
              <StyledInnerCard
                actions={useMemo(
                  () => [
                    <Attachment
                      URI={metaEvidence.metaEvidenceJSON.fileURI}
                      description="This is the primary file uploaded with the dispute."
                      extension={
                        metaEvidence.metaEvidenceJSON.fileTypeExtension
                      }
                      title="Main File"
                    />,
                    <StyledInnerCardActionsTitleDiv className="ternary-color theme-color">
                      Primary Documents
                    </StyledInnerCardActionsTitleDiv>
                  ],
                  [metaEvidence]
                )}
                hoverable
              >
                {metaEvidence.metaEvidenceJSON.description}
              </StyledInnerCard>
            </Col>
          </Row>
          <Skeleton active loading={!evidence} title={false}>
            {evidence && (
              <Row gutter={40}>
                {Object.keys(evidenceBySubmitter).map(a => (
                  <Col key={a} md={12}>
                    <StyledInnerCard
                      actions={useMemo(
                        () => [
                          ...evidenceBySubmitter[a].map(e => (
                            <Attachment
                              URI={e.evidenceJSON.fileURI}
                              description={e.evidenceJSON.description}
                              extension={e.evidenceJSON.fileTypeExtension}
                              title={e.evidenceJSON.name}
                            />
                          )),
                          <StyledInnerCardActionsTitleDiv className="ternary-color theme-color">
                            Evidence
                          </StyledInnerCardActionsTitleDiv>
                        ],
                        [evidence]
                      )}
                      hoverable
                      title={
                        <>
                          <StyledIdenticon account={a} />
                          {metaEvidence.metaEvidenceJSON.aliases[a] || '?'}
                        </>
                      }
                    />
                  </Col>
                ))}
              </Row>
            )}
          </Skeleton>
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
