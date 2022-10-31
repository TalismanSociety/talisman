import { db } from "@core/libs/db"
import { provideContext } from "@talisman/util/provideContext"
import { useLiveQuery } from "dexie-react-hooks"
import { useMemo } from "react"
import { useSettings } from "./useSettings"

const filterTestnets =
  (useTestnets: boolean) =>
  ({ isTestnet }: { isTestnet?: boolean }) =>
    useTestnets ? true : isTestnet === false

const useDbCacheProvider = () => {
  const allChainsRaw = useLiveQuery(() => db.chains.toArray(), [])
  const allEvmNetworksRaw = useLiveQuery(() => db.evmNetworks.toArray(), [])
  const allTokensRaw = useLiveQuery(() => db.tokens.toArray(), [])
  const allBalancesRaw = useLiveQuery(() => db.balances.toArray(), [])

  const { useTestnets = false } = useSettings()

  const allChains = useMemo(
    () => allChainsRaw?.filter(filterTestnets(useTestnets)) ?? [],
    [allChainsRaw, useTestnets]
  )
  const allEvmNetworks = useMemo(
    () => allEvmNetworksRaw?.filter(filterTestnets(useTestnets)) ?? [],
    [allEvmNetworksRaw, useTestnets]
  )
  const allTokens = useMemo(
    () => allTokensRaw?.filter(filterTestnets(useTestnets)) ?? [],
    [allTokensRaw, useTestnets]
  )
  const allBalances = useMemo(() => allBalancesRaw ?? [], [allBalancesRaw])

  const chainsMap = useMemo(
    () => Object.fromEntries(allChains.map((chain) => [chain.id, chain])),
    [allChains]
  )
  const evmNetworksMap = useMemo(
    () => Object.fromEntries(allEvmNetworks.map((evmNetwork) => [evmNetwork.id, evmNetwork])),
    [allEvmNetworks]
  )
  const tokensMap = useMemo(
    () => Object.fromEntries(allTokens.map((token) => [token.id, token])),
    [allTokens]
  )

  return {
    allChains,
    allEvmNetworks,
    allTokens,
    allBalances,
    chainsMap,
    evmNetworksMap,
    tokensMap,
  }
}

export const [DbCacheProvider, useDbCache] = provideContext(useDbCacheProvider)
