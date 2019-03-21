import { useEffect, useState } from 'react'
import web3DeriveAccount from '../temp/web3-derive-account'

const funcs = [
  {
    URL: process.env.REACT_APP_USER_SETTINGS_URL,
    method: 'GET',
    name: 'getUserSettings',
    payload: 'settings'
  },
  {
    URL: process.env.REACT_APP_USER_SETTINGS_URL,
    method: 'PATCH',
    name: 'patchUserSettings',
    payload: 'settings'
  },
  {
    URL: process.env.REACT_APP_JUSTIFICATIONS_URL,
    method: 'PUT',
    name: 'putJustifications',
    payload: 'justification'
  }
]

export const API = funcs.reduce((acc, f) => {
  acc[f.name] = async (web3, account, payload) => {
    const derivedAccount = await web3DeriveAccount(
      web3,
      account,
      'Kleros Court Secret'
    )
    const func = () =>
      fetch(f.URL, {
        body: JSON.stringify({
          payload: {
            address: account,
            signature: derivedAccount.sign(JSON.stringify(payload)).signature,
            [f.payload]: payload
          }
        }),
        headers: { 'Content-Type': 'application/json' },
        method: f.method === 'GET' ? 'POST' : f.method
      }).then(res => res.json())
    const res = await func()
    if (res.error) {
      const settings = {
        derivedAccountAddress: {
          S: derivedAccount.address
        }
      }
      await fetch(process.env.REACT_APP_USER_SETTINGS_URL, {
        body: JSON.stringify({
          payload: {
            address: account,
            settings,
            signature: await web3.eth.personal.sign(
              JSON.stringify(settings),
              account
            )
          }
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH'
      }).then(res => res.json())
      return func()
    }
    return res
  }
  return acc
}, {})

export const useAPI = funcs.reduce((acc, f) => {
  acc[f.name] = (web3, account, payload) => {
    const [state, setState] = useState(
      f.method === 'GET' ? 'pending' : undefined
    )
    let mounted = true
    const send = async payload => {
      let state
      try {
        if (state !== 'pending') setState('pending')
        state = await API[f.name](web3, account, payload)
      } catch (err) {
        console.error(err)
        state = { error: 'An unexpected error occurred.' }
      }
      if (mounted) setState(state)
    }
    if (f.method === 'GET') {
      useEffect(() => {
        send(payload)
        return () => (mounted = false)
      }, [web3, account, JSON.stringify(payload)])
      return state
    }
    return { send, state }
  }
  return acc
}, {})
