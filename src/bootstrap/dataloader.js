import Dataloader from 'dataloader'
import { useState } from 'react'

export const dataloader = new Dataloader(URLs =>
  Promise.all(URLs.map(URL => fetch(URL).then(res => res.json())))
)

export const useDataloader = () => {
  const [state, setState] = useState({})
  return URL =>
    state[URL] ||
    (dataloader
      .load(URL)
      .then(json => setState(state => ({ ...state, [URL]: json }))) &&
      undefined)
}
