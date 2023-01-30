import { DbTokenRates, db } from "@core/db"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { provideContext } from "@talisman/util/provideContext"
import { BalanceJson, db as balancesDb } from "@talismn/balances"
import {
  Chain,
  ChainId,
  ChainList,
  CustomChain,
  CustomEvmNetwork,
  EvmNetwork,
  EvmNetworkId,
  EvmNetworkList,
  Token,
  TokenId,
  TokenList,
} from "@talismn/chaindata-provider"
import { TokenRates } from "@talismn/token-rates"
import { useLiveQuery } from "dexie-react-hooks"
import { useEffect, useRef, useState } from "react"
import { useDebounce } from "react-use"

import { useSettings } from "./useSettings"

const filterTestnets =
  (useTestnets: boolean) =>
  ({ isTestnet }: { isTestnet?: boolean }) =>
    useTestnets ? true : isTestnet === false

type DbCache = {
  allChains: (Chain | CustomChain)[]
  allEvmNetworks: (EvmNetwork | CustomEvmNetwork)[]
  allTokens: Token[]
  allBalances: BalanceJson[]
  chainsMap: Record<ChainId, Chain>
  evmNetworksMap: Record<EvmNetworkId, EvmNetwork>
  tokensMap: Record<TokenId, Token>
  tokenRatesMap: Record<TokenId, TokenRates>
}

const DEFAULT_VALUE: DbCache = {
  allChains: [],
  allEvmNetworks: [],
  allTokens: [],
  allBalances: [],
  chainsMap: {},
  evmNetworksMap: {},
  tokensMap: {},
  tokenRatesMap: {},
}

const consolidateDbCache = (
  chainList?: ChainList,
  evmNetworkList?: EvmNetworkList,
  tokenList?: TokenList,
  rawBalances?: BalanceJson[],
  tokenRates?: DbTokenRates[],
  withTestnets = false
): DbCache => {
  if (!chainList || !evmNetworkList || !tokenList || !rawBalances || !tokenRates)
    return DEFAULT_VALUE

  // BEGIN: temp hack to indicate that
  //          - EVM GLMR is a mirror of substrate GLMR
  //          - EVM MOVR is a mirror of substrate MOVR
  //          - EVM DEV is a mirror of substrate DEV
  //          - EVM ACA is a mirror of substrate ACA
  const mirrorTokenIds = {
    "1284-evm-native-glmr": "moonbeam-substrate-native-glmr",
    "1285-evm-native-movr": "moonriver-substrate-native-movr",
    "1287-evm-native-dev": "moonbase-alpha-testnet-substrate-native-dev",
    "787-evm-native-aca": "acala-substrate-native-aca",
  }

  Object.entries(mirrorTokenIds)
    .filter(([mirrorToken]) => tokenList[mirrorToken])
    .forEach(([mirrorToken, mirrorOf]) => ((tokenList[mirrorToken] as any).mirrorOf = mirrorOf))
  // END: temp hack

  const allChains = Object.values(chainList).filter(filterTestnets(withTestnets))
  const allEvmNetworks = Object.values(evmNetworkList).filter(filterTestnets(withTestnets))
  const allTokens = Object.values(tokenList).filter(filterTestnets(withTestnets))

  const chainsMap = Object.fromEntries(allChains.map((chain) => [chain.id, chain]))
  const evmNetworksMap = Object.fromEntries(allEvmNetworks.map((network) => [network.id, network]))
  const tokensMap = Object.fromEntries(allTokens.map((token) => [token.id, token]))
  const tokenRatesMap = Object.fromEntries(tokenRates.map(({ tokenId, rates }) => [tokenId, rates]))

  // return balances for which we have a token, this prevents errors when toggling testnets on/off
  const allBalances = rawBalances.filter((b) => tokensMap[b.tokenId])

  return {
    allChains,
    allEvmNetworks,
    allTokens,
    allBalances,
    chainsMap,
    evmNetworksMap,
    tokensMap,
    tokenRatesMap,
  }
}

const useDbCacheProvider = (): DbCache => {
  const { useTestnets = false } = useSettings()

  const chainList = useLiveQuery(() => chaindataProvider.chains(), [])
  const evmNetworkList = useLiveQuery(() => chaindataProvider.evmNetworks(), [])
  const tokenList = useLiveQuery(() => chaindataProvider.tokens(), [])
  const rawBalances = useLiveQuery(() => balancesDb.balances.toArray(), [])
  const tokenRates = useLiveQuery(() => db.tokenRates.toArray(), [])

  const [dbData, setDbData] = useState(DEFAULT_VALUE)

  // debounce every 500ms to prevent hammering UI with updates
  useDebounce(
    () => {
      setDbData(
        consolidateDbCache(
          chainList,
          evmNetworkList,
          tokenList,
          rawBalances,
          tokenRates,
          useTestnets
        )
      )
    },
    500,
    [chainList, evmNetworkList, tokenList, rawBalances, tokenRates, useTestnets]
  )

  const refInitialized = useRef(false)

  // force an update as soon as all datasources are fetched, so UI can display data ASAP
  useEffect(() => {
    if (
      !refInitialized.current &&
      chainList &&
      evmNetworkList &&
      tokenList &&
      rawBalances &&
      tokenRates
    ) {
      setDbData(
        consolidateDbCache(
          chainList,
          evmNetworkList,
          tokenList,
          rawBalances,
          tokenRates,
          useTestnets
        )
      )
      refInitialized.current = true
    }
  }, [chainList, evmNetworkList, rawBalances, tokenList, tokenRates, useTestnets])

  return dbData
}

export const [DbCacheProvider, useDbCache] = provideContext(useDbCacheProvider)
