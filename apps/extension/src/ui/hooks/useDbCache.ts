import { db } from "@core/db"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { provideContext } from "@talisman/util/provideContext"
import { db as balancesDb } from "@talismn/balances"
import { useLiveQuery } from "dexie-react-hooks"
import { useMemo } from "react"

import { useSettings } from "./useSettings"

const filterTestnets =
  (useTestnets: boolean) =>
  ({ isTestnet }: { isTestnet?: boolean }) =>
    useTestnets ? true : isTestnet === false

const useDbCacheProvider = () => {
  const { useTestnets = false } = useSettings()

  const chains = useLiveQuery(
    async () => Object.values(await chaindataProvider.chains()).filter(filterTestnets(useTestnets)),
    [useTestnets]
  )
  const evmNetworks = useLiveQuery(
    async () =>
      Object.values(await chaindataProvider.evmNetworks()).filter(filterTestnets(useTestnets)),
    [useTestnets]
  )
  const tokens = useLiveQuery(
    async () => Object.values(await chaindataProvider.tokens()).filter(filterTestnets(useTestnets)),
    [useTestnets]
  )
  const tokenRates = useLiveQuery(async () => await db.tokenRates.toArray(), [])
  const balances = useLiveQuery(async () => await balancesDb.balances.toArray(), [])

  const chainsMap = useMemo(
    () => Object.fromEntries((chains ?? []).map((chain) => [chain.id, chain])),
    [chains]
  )
  const evmNetworksMap = useMemo(
    () => Object.fromEntries((evmNetworks ?? []).map((evmNetwork) => [evmNetwork.id, evmNetwork])),
    [evmNetworks]
  )
  const tokensMap = useMemo(
    () => Object.fromEntries((tokens ?? []).map((token) => [token.id, token])),
    [tokens]
  )
  const tokenRatesMap = useMemo(
    () => Object.fromEntries((tokenRates ?? []).map(({ tokenId, rates }) => [tokenId, rates])),
    [tokenRates]
  )

  return {
    allChains: chains ?? [],
    allEvmNetworks: evmNetworks ?? [],
    allTokens: tokens ?? [],
    allBalances: balances ?? [],
    chainsMap,
    evmNetworksMap,
    tokensMap,
    tokenRatesMap: tokenRatesMap ?? {},
  }
}

export const [DbCacheProvider, useDbCache] = provideContext(useDbCacheProvider)
