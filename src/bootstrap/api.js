import { useEffect, useState } from 'react'
import web3DeriveAccount from '../temp/web3-derive-account'

const funcs = [
  {
    URL: process.env.REACT_APP_USER_SETTINGS_URL,
    createDerived: false,
    method: 'GET',
    name: 'getUserSettings',
    payload: 'settings',
    signingMethod: 'derived'
  },
  {
    URL: process.env.REACT_APP_USER_SETTINGS_URL,
    createDerived: true,
    method: 'PATCH',
    name: 'patchUserSettings',
    payload: 'settings',
    signingMethod: 'derived'
  },
  {
    URL: process.env.REACT_APP_JUSTIFICATIONS_URL,
    method: 'GET',
    name: 'getJustifications',
    signingMethod: null
  },
  {
    URL: process.env.REACT_APP_JUSTIFICATIONS_URL,
    createDerived: true,
    method: 'PUT',
    name: 'putJustifications',
    payload: 'justification',
    signingMethod: 'derived'
  }
]

export const API = funcs.reduce((acc, f) => {
  acc[f.name] = async (web3, account, payload) => {
    let derivedAccount
    if (f.signingMethod === 'derived')
      derivedAccount = await web3DeriveAccount(
        web3,
        account,
        'To keep your data safe and to use certain features of Kleros, we ask that you sign these messages to create a secret key for your account. This key is unrelated from your main Ethereum account and will not be able to send any transactions.',
        f.createDerived
      )

    const network = await web3.eth.net.getNetworkType()
    if (!f.payload)
      payload['network'] = network === 'main' ? 'mainnet' : network

    // Use different signing method depending on the situation
    let signature
    if (f.signingMethod === 'derived' && derivedAccount)
      signature = derivedAccount.sign(JSON.stringify(payload)).signature
    else if (f.signingMethod === 'personal')
      signature = await web3.eth.sign(JSON.stringify(payload), account)

    const func = () =>
      fetch(f.URL, {
        body: JSON.stringify({
          payload: f.payload
            ? {
                address: account,
                network: network === 'main' ? 'mainnet' : network,
                signature,
                [f.payload]: payload
              }
            : payload
        }),
        headers: { 'Content-Type': 'application/json' },
        method: f.method === 'GET' ? 'POST' : f.method
      }).then(res => res.json())
    const res = await func()
    if (res.error && derivedAccount) {
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
