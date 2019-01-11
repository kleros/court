import { useRef, useState } from 'react'
import Dataloader from 'dataloader'
import archon from './archon'

export const dataloader = new Dataloader(URLs =>
  Promise.all(URLs.map(URL => fetch(URL).then(res => res.json())))
)

export const useDataloader = () => {
  const [state, setState] = useState({})
  const loadedRef = useRef({})
  return URL =>
    loadedRef.current[URL]
      ? state[URL]
      : dataloader.load(URL).then(json => {
          loadedRef.current[URL] = true
          setState(state => ({ ...state, [URL]: json }))
        }) && undefined
}

export const archonArbitrableDataloaders = [
  'getDispute',
  'getMetaEvidence',
  'getEvidence'
].reduce((acc, f) => {
  acc[f] = new Dataloader(
    argsArr =>
      Promise.all(
        argsArr.map(args => archon.arbitrable[f](...args).catch(() => null))
      ),
    { cacheKeyFn: JSON.stringify }
  )
  return acc
}, {})

export const useArchonArbitrableDataloader = Object.keys(
  archonArbitrableDataloaders
).reduce((acc, f) => {
  acc[f] = () => {
    const [state, setState] = useState({})
    const loadedRef = useRef({})
    return (...args) => {
      const key = JSON.stringify(args)
      return loadedRef.current[key]
        ? state[key]
        : archonArbitrableDataloaders[f].load(args).then(res => {
            loadedRef.current[key] = true
            setState(state => ({ ...state, [key]: res }))
          }) && undefined
    }
  }
  return acc
}, {})
