import { useEffect, useRef, useState } from 'react'
import Dataloader from 'dataloader'
import archon from './archon'

const funcs = {
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
          strictHashes: true,
          ...options
        })
      )
      .catch(() => ({
        metaEvidenceJSON: {
          description:
            'The data for this case is not formatted correctly or has been tampered since the time of its submission. Please refuse to arbitrate this case.',
          title: 'Invalid or tampered case data, refuse to arbitrate.'
        }
      })),
  load: (URI, options) =>
    archon.utils
      .validateFileFromURI(URI, {
        strictHashes: true,
        ...options
      })
      .then(res => res.file)
      .catch(() => null)
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
