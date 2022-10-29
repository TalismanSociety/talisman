import { db } from "@core/libs/db"
import { provideContext } from "@talisman/util/provideContext"
import { useLiveQuery } from "dexie-react-hooks"
import { useMemo } from "react"

const useDbCacheProvider = () => {
  const allChainsRaw = useLiveQuery(() => db.chains.toArray(), [])
  const allEvmNetworksRaw = useLiveQuery(() => db.evmNetworks.toArray(), [])
  const allTokensRaw = useLiveQuery(() => db.tokens.toArray(), [])
  const allBalancesRaw = useLiveQuery(() => db.balances.toArray(), [])

  const allChains = useMemo(() => allChainsRaw ?? [], [allChainsRaw])
  const allEvmNetworks = useMemo(() => allEvmNetworksRaw ?? [], [allEvmNetworksRaw])
  const allTokens = useMemo(() => allTokensRaw ?? [], [allTokensRaw])
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
