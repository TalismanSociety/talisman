import { EvmTokenFetcher, MiniMetadataUpdater, db as balancesDb } from "@talismn/balances"
import { liveQuery } from "dexie"
import { atom } from "jotai"
import { atomWithObservable } from "jotai/utils"
import { from } from "rxjs"

import { balanceModulesAtom } from "./balanceModules"
import { chainConnectorsAtom } from "./chainConnectors"
import { chaindataProviderAtom } from "./chaindata"

export const miniMetadataUpdaterAtom = atom<MiniMetadataUpdater>((get) => {
  const chainConnectors = get(chainConnectorsAtom)
  const chaindataProvider = get(chaindataProviderAtom)
  const balanceModules = get(balanceModulesAtom)

  return new MiniMetadataUpdater(chainConnectors, chaindataProvider, balanceModules)
})

export const evmTokenFetcherAtom = atom<EvmTokenFetcher>((get) => {
  const chaindataProvider = get(chaindataProviderAtom)
  const balanceModules = get(balanceModulesAtom)

  return new EvmTokenFetcher(chaindataProvider, balanceModules)
})

export const miniMetadatasAtom = atomWithObservable(() =>
  from(
    // retrieve fetched miniMetadatas from the db
    liveQuery(() => balancesDb.miniMetadatas.toArray())
  )
)
