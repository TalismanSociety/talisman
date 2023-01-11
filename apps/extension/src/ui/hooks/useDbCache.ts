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
  const tokens = useLiveQuery(async () => {
    // BEGIN: temp hack to indicate that
    //          - EVM GLMR is a mirror of substrate GLMR
    //          - EVM MOVR is a mirror of substrate MOVR
    //          - EVM DEV is a mirror of substrate DEV
    //          - EVM ACA is a mirror of substrate ACA
    const tokens = await chaindataProvider.tokens()

    const mirrorTokenIds = {
      "1284-evm-native-glmr": "moonbeam-substrate-native-glmr",
      "1285-evm-native-movr": "moonriver-substrate-native-movr",
      "1287-evm-native-dev": "moonbase-alpha-testnet-substrate-native-dev",
      "787-evm-native-aca": "acala-substrate-native-aca",
    }

    Object.entries(mirrorTokenIds)
      .filter(([mirrorToken]) => tokens[mirrorToken])
      .forEach(([mirrorToken, mirrorOf]) => ((tokens[mirrorToken] as any).mirrorOf = mirrorOf))
    // END: temp hack

    return Object.values(tokens).filter(filterTestnets(useTestnets))
  }, [useTestnets])
  const tokenRates = useLiveQuery(async () => await db.tokenRates.toArray(), [])

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

  const balances = useLiveQuery(
    // return balances for which we have a token, this prevents errors when toggling testnets on/off
    async () => (await balancesDb.balances.toArray()).filter((b) => tokensMap[b.tokenId]),
    [tokensMap]
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
