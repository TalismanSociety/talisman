import { db as balancesDb } from "@talismn/balances"
import { firstThenDebounce } from "@talismn/util"
import { liveQuery } from "dexie"
import { atom } from "jotai"
import { atomWithObservable } from "jotai/utils"
import { combineLatest, from, map } from "rxjs"

import { chaindataProviderAtom } from "./chaindataProvider"
import { enableTestnetsAtom } from "./config"

/** Only includes testnets when `enableTestnetsAtom` is true */
export const chaindataAtom = atom(async (get) => {
  const chaindata = await get(allChaindataAtom)

  const enableTestnets = get(enableTestnetsAtom)

  const filterTestnets = <T extends { isTestnet: boolean }>(items: T[]) =>
    enableTestnets ? items : items.filter(({ isTestnet }) => !isTestnet)
  const filterMapTestnets = <T extends { isTestnet: boolean }>(items: Record<string, T>) =>
    enableTestnets
      ? items
      : Object.fromEntries(Object.entries(items).filter(([, { isTestnet }]) => !isTestnet))

  const chains = filterTestnets(chaindata.chains)
  const chainsById = filterMapTestnets(chaindata.chainsById)
  const chainsByGenesisHash = filterMapTestnets(chaindata.chainsByGenesisHash)
  const evmNetworks = filterTestnets(chaindata.evmNetworks)
  const evmNetworksById = filterMapTestnets(chaindata.evmNetworksById)
  const tokens = filterTestnets(chaindata.tokens)
  const tokensById = filterMapTestnets(chaindata.tokensById)
  const miniMetadatas = chaindata.miniMetadatas

  const enabledTokens = tokens.filter(
    (token) => token.isDefault || ("isCustom" in token && token.isCustom)
  )
  const enabledTokensById = Object.fromEntries(
    Object.entries(tokensById).filter(
      ([, token]) => token.isDefault || ("isCustom" in token && token.isCustom)
    )
  )

  return {
    chains,
    chainsById,
    chainsByGenesisHash,
    evmNetworks,
    evmNetworksById,
    tokens: enabledTokens,
    tokensById: enabledTokensById,
    miniMetadatas,
  }
})

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

/** Always includes all chaindata (e.g. testnets) */
const allChaindataAtom = atomWithObservable((get) =>
  combineLatest([
    get(chaindataProviderAtom).chainsObservable,
    get(chaindataProviderAtom).chainsByIdObservable,
    get(chaindataProviderAtom).chainsByGenesisHashObservable,
    get(chaindataProviderAtom).evmNetworksObservable,
    get(chaindataProviderAtom).evmNetworksByIdObservable,
    get(chaindataProviderAtom).tokensObservable,
    get(chaindataProviderAtom).tokensByIdObservable,
    from(liveQuery(() => balancesDb.miniMetadatas.toArray())),
  ]).pipe(
    // debounce to prevent hammering UI with updates
    firstThenDebounce(1_000),
    map(
      ([
        chains,
        chainsById,
        chainsByGenesisHash,
        evmNetworks,
        evmNetworksById,
        tokens,
        tokensById,
        miniMetadatas,
      ]) => ({
        chains,
        chainsById,
        chainsByGenesisHash,
        evmNetworks,
        evmNetworksById,
        tokens,
        tokensById,
        miniMetadatas,
      })
    )
  )
)
