import { useEffect, useRef, useState } from 'react'
import Dataloader from 'dataloader'
import archon from './archon'

const funcs = {
  getAppealDecision: (arbitratorAddress, disputeID, appeal, options) =>
    archon.arbitrator
      .getAppealDecision(arbitratorAddress, disputeID, appeal, {
        ...options
      })
      .catch(() => ({
        appealedAt: null
      })),
  getDisputeCreation: (arbitratorAddress, disputeID, options) =>
    archon.arbitrator.getDisputeCreation(arbitratorAddress, disputeID, {
      ...options
    }),
  getEvidence: (contractAddress, arbitratorAddress, disputeID, options) =>
    archon.arbitrable
      .getDispute(contractAddress, arbitratorAddress, disputeID, {
        ...options
      })
      .then(d =>
        archon.arbitrable.getEvidence(
          contractAddress,
          arbitratorAddress,
          d.evidenceGroupID,
          {
            ...options
          }
        )
      )
      .then(evidence =>
        evidence.filter(
          e => e.evidenceJSONValid && (!e.evidenceJSON.fileURI || e.fileValid)
        )
      ),
  getMetaEvidence: (contractAddress, arbitratorAddress, disputeID, options) =>
    archon.arbitrable
      .getDispute(contractAddress, arbitratorAddress, disputeID, {
        ...options
      })
      .then(d =>
        archon.arbitrable.getMetaEvidence(contractAddress, d.metaEvidenceID, {
          scriptParameters: { disputeID, arbitrableContractAddress: contractAddress, arbitratorContractAddress: arbitratorAddress },
          strictHashes: disputeID !== '544', // TODO: Remove this bandaid once the dispute is resolved.
          ...options
        })
      )
      .catch(e => {
        console.log(e)
        return ({
          metaEvidenceJSON: {
            description:
              'The data for this case is not formatted correctly or has been tampered since the time of its submission. Please refresh the page and refuse to arbitrate if the problem persists.',
            title: 'Invalid or tampered case data, refuse to arbitrate.'
          }
        })
      }),
  loadPolicy: (URI, options) => {
    if (!options) options = {}
    if (URI.startsWith("/ipfs/")) options.preValidated = true

    return archon.utils
      .validateFileFromURI(
        URI.replace(/^\/ipfs\//, 'https://ipfs.kleros.io/ipfs/'),
        {
          ...options
        }
      )
      .then(res => res.file)
      .catch(() => ({
        description: 'Please contact the governance team.',
        name: 'Invalid Court Data',
        summary:
          'The data for this court is not formatted correctly or has been tampered since the time of its submission.'
      }))
  }

}
export const dataloaders = Object.keys(funcs).reduce((acc, f) => {
  acc[f] = new Dataloader(
    argsArr => Promise.all(argsArr.map(args => funcs[f](...args))),
    { cacheKeyFn: JSON.stringify }
  )
  return acc
}, {})

export const useDataloader = Object.keys(dataloaders).reduce((acc, f) => {
  acc[f] = () => {
    const [state, setState] = useState({})
    const loadedRef = useRef({})
    let mounted = true
    useEffect(() => () => (mounted = false))
    return (...args) => {
      const key = JSON.stringify(args)
      return loadedRef.current[key]
        ? state[key]
        : dataloaders[f].load(args).then(res => {
            if (mounted) {
              loadedRef.current[key] = true
              setState(state => ({ ...state, [key]: res }))
            }
          }) && undefined
    }
  }
  return acc
}, {})

export const VIEW_ONLY_ADDRESS = '0x0000000000000000000000000000000000000000'
