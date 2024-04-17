import { db as balancesDb } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"
import { firstThenDebounce } from "@talismn/util"
import { liveQuery } from "dexie"
import { atom } from "jotai"
import { atomWithObservable } from "jotai/utils"
import isEqual from "lodash/isEqual"
import { combineLatest, distinctUntilChanged, map } from "rxjs"

import { dexieToRxjs } from "../util/dexieToRxjs"
import { chaindataProviderAtom } from "./chaindataProvider"
import { enableTestnetsAtom } from "./config"

export const chainsAtom = atom(async (get) => (await get(chaindataAtom)).chains)
export const chainsByIdAtom = atom(async (get) => (await get(chaindataAtom)).chainsById)
export const chainsByGenesisHashAtom = atom(
  async (get) => (await get(chaindataAtom)).chainsByGenesisHash
)
export const evmNetworksAtom = atom(async (get) => (await get(chaindataAtom)).evmNetworks)
export const evmNetworksByIdAtom = atom(async (get) => (await get(chaindataAtom)).evmNetworksById)
export const tokensAtom = atom(async (get) => (await get(chaindataAtom)).tokens)
export const tokensByIdAtom = atom(async (get) => (await get(chaindataAtom)).tokensById)
export const miniMetadatasAtom = atom(async (get) => (await get(chaindataAtom)).miniMetadatas)

export const chaindataAtom = atomWithObservable((get) => {
  const enableTestnets = get(enableTestnetsAtom)

  const filterTestnets = <T extends { isTestnet: boolean }>(items: T[]) =>
    enableTestnets ? items : items.filter(({ isTestnet }) => !isTestnet)
  const filterMapTestnets = <T extends { isTestnet: boolean }>(items: Record<string, T>) =>
    enableTestnets
      ? items
      : Object.fromEntries(Object.entries(items).filter(([, { isTestnet }]) => !isTestnet))

  const filterEnabledTokens = (tokens: Token[]) =>
    tokens.filter((token) => token.isDefault || ("isCustom" in token && token.isCustom))
  const filterMapEnabledTokens = (tokensById: Record<string, Token>) =>
    Object.fromEntries(
      Object.entries(tokensById).filter(
        ([, token]) => token.isDefault || ("isCustom" in token && token.isCustom)
      )
    )

  const distinctUntilIsEqual = distinctUntilChanged(<T>(a: T, b: T) => isEqual(a, b))

  const chains = get(chaindataProviderAtom).chainsObservable.pipe(
    distinctUntilIsEqual,
    map(filterTestnets),
    distinctUntilIsEqual
  )
  const chainsById = get(chaindataProviderAtom).chainsByIdObservable.pipe(
    distinctUntilIsEqual,
    map(filterMapTestnets),
    distinctUntilIsEqual
  )
  const chainsByGenesisHash = get(chaindataProviderAtom).chainsByGenesisHashObservable.pipe(
    distinctUntilIsEqual,
    map(filterMapTestnets),
    distinctUntilIsEqual
  )
  const evmNetworks = get(chaindataProviderAtom).evmNetworksObservable.pipe(
    distinctUntilIsEqual,
    map(filterTestnets),
    distinctUntilIsEqual
  )
  const evmNetworksById = get(chaindataProviderAtom).evmNetworksByIdObservable.pipe(
    distinctUntilIsEqual,
    map(filterMapTestnets),
    distinctUntilIsEqual
  )
  const tokens = get(chaindataProviderAtom).tokensObservable.pipe(
    distinctUntilIsEqual,
    map(filterTestnets),
    map(filterEnabledTokens),
    distinctUntilIsEqual
  )
  const tokensById = get(chaindataProviderAtom).tokensByIdObservable.pipe(
    distinctUntilIsEqual,
    map(filterMapTestnets),
    map(filterMapEnabledTokens),
    distinctUntilIsEqual
  )
  const miniMetadatasObservable = dexieToRxjs(liveQuery(() => balancesDb.miniMetadatas.toArray()))
  const miniMetadatas = combineLatest([
    miniMetadatasObservable.pipe(distinctUntilIsEqual),
    chainsById,
  ]).pipe(
    map(([miniMetadatas, chainsById]) => miniMetadatas.filter((m) => chainsById[m.chainId])),
    distinctUntilIsEqual
  )

  return combineLatest({
    chains,
    chainsById,
    chainsByGenesisHash,
    evmNetworks,
    evmNetworksById,
    tokens,
    tokensById,
    miniMetadatas,
  }).pipe(
    // debounce to prevent hammering UI with updates
    firstThenDebounce(1_000),
    distinctUntilIsEqual
  )
})
