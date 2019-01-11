import { useRef, useState } from 'react'
import Dataloader from 'dataloader'
import archon from './archon'

const funcs = {
  getEvidence: (contractAddress, arbitratorAddress, disputeID, options) =>
    archon.arbitrable
      .getEvidence(contractAddress, arbitratorAddress, disputeID, {
        strictHashes: true,
        ...options
      })
      .catch(() => null),
  getMetaEvidence: (contractAddress, arbitratorAddress, disputeID, options) =>
    archon.arbitrable
      .getDispute(contractAddress, arbitratorAddress, disputeID, {
        strictHashes: true,
        ...options
      })
      .then(d =>
        archon.arbitrable.getMetaEvidence(contractAddress, d.metaEvidenceID, {
          strictHashes: true,
          ...options
        })
      )
      .catch(() => null),
  load: URI => fetch(URI).then(res => res.json())
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
    return (...args) => {
      const key = JSON.stringify(args)
      return loadedRef.current[key]
        ? state[key]
        : dataloaders[f].load(args).then(res => {
            loadedRef.current[key] = true
            setState(state => ({ ...state, [key]: res }))
          }) && undefined
    }
  }
  return acc
}, {})
