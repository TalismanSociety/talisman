import { firstThenDebounce } from "@talismn/util"
import { atom } from "jotai"
import { atomWithObservable } from "jotai/utils"
import { keyBy } from "lodash-es"
import { combineLatest } from "rxjs"

import { chaindataProviderAtom } from "./chaindataProvider"
import { enabledChainsAtom, enabledTokensAtom, enableTestnetsAtom } from "./config"

export const chaindataAtom = atomWithObservable((get) => {
  return combineLatest({
    networks: get(chaindataProviderAtom).networks$,
    tokens: get(chaindataProviderAtom).tokens$,
  }).pipe(firstThenDebounce(1_000))
})

const filteredChaindataAtom = atom(async (get) => {
  const enabledNetworkIds = get(enabledChainsAtom)
  const enabledTokenIds = get(enabledTokensAtom)
  const enableTestnets = get(enableTestnetsAtom)

  const chaindata = await get(chaindataAtom)
  const networks = chaindata.networks.filter(
    (n) => (enabledNetworkIds?.includes(n.id) || n.isDefault) && (enableTestnets || !n.isTestnet),
  )

  const networkById = keyBy(networks, (n) => n.id)
  const tokens = chaindata.tokens.filter(
    (token) =>
      (enabledTokenIds?.includes(token.id) || token.isDefault) && networkById[token.networkId],
  )

  return { networks, tokens }
})

export const tokensAtom = atom(async (get) => {
  const chaindata = await get(filteredChaindataAtom)
  return chaindata.tokens
})

export const networksAtom = atom(async (get) => {
  const chaindata = await get(filteredChaindataAtom)
  return chaindata.networks
})
