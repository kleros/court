import { Collapse, Divider, Skeleton, Tabs } from 'antd'
import React, { Fragment } from 'react'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import PropTypes from 'prop-types'
import { useAPI } from '../bootstrap/api'
import { useDataloader } from '../bootstrap/dataloader'

const CaseRoundHistory = ({ ID, disabled, round }) => {
  const { drizzle, useCacheCall } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0]
  }))
  const getMetaEvidence = useDataloader.getMetaEvidence()
  const dispute = useCacheCall('KlerosLiquid', 'disputes', ID)
  let metaEvidence
  if (dispute)
    metaEvidence = getMetaEvidence(
      dispute.arbitrated,
      drizzle.contracts.KlerosLiquid.address,
      ID
    )
  const _justifications = useAPI.getJustifications(
    drizzle.web3,
    drizzleState.account,
    { appeal: round, disputeID: ID }
  )
  const justifications = useCacheCall(['KlerosLiquid'], call => {
    let justifications = { loading: true }
    if (metaEvidence && _justifications && _justifications !== 'pending')
      justifications = _justifications.payload.justifications.Items.reduce(
        (acc, j) => {
          const vote = call('KlerosLiquid', 'getVote', ID, round, j.voteID.N)
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
    return justifications
  })
  return (
    <Collapse>
      <Collapse.Panel disabled={disabled} header={`Round ${round + 1}`}>
        <Skeleton active loading={justifications.loading}>
          {!justifications.loading && (
            <Tabs>
              {justifications.byChoice.map(
                (j, i) =>
                  (i < justifications.byChoice.length - 1 || j.length > 0) && (
                    <Tabs.TabPane
                      disabled={j.length === 0}
                      key={i}
                      tab={
                        i === 0
                          ? 'Refuse to Arbitrate'
                          : (metaEvidence.metaEvidenceJSON.rulingOptions &&
                              metaEvidence.metaEvidenceJSON.rulingOptions
                                .titles &&
                              metaEvidence.metaEvidenceJSON.rulingOptions
                                .titles[i - 1]) ||
                            'Unknown Choice'
                      }
                    >
                      {j.map((j, i) => (
                        <Fragment key={i}>
                          {j}
                          <Divider />
                        </Fragment>
                      ))}
                    </Tabs.TabPane>
                  )
              )}
            </Tabs>
          )}
        </Skeleton>
      </Collapse.Panel>
    </Collapse>
  )
}

CaseRoundHistory.propTypes = {
  ID: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
  round: PropTypes.number.isRequired
}

export default CaseRoundHistory
