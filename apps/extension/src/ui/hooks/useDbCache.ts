import { db } from "@core/db"
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
import { DbTokenRates, TokenRates } from "@talismn/token-rates"
import { useLiveQuery } from "dexie-react-hooks"
import { useEffect, useRef, useState } from "react"
import { useDebounce } from "react-use"

const filterNoTestnet = ({ isTestnet }: { isTestnet?: boolean }) => isTestnet === false

type DbCache = {
  chainsWithTestnets: (Chain | CustomChain)[]
  chainsWithoutTestnets: (Chain | CustomChain)[]
  evmNetworksWithTestnets: (EvmNetwork | CustomEvmNetwork)[]
  evmNetworksWithoutTestnets: (EvmNetwork | CustomEvmNetwork)[]
  tokensWithTestnets: Token[]
  tokensWithoutTestnets: Token[]

  chainsWithTestnetsMap: Record<ChainId, Chain>
  chainsWithoutTestnetsMap: Record<ChainId, Chain>
  evmNetworksWithTestnetsMap: Record<EvmNetworkId, EvmNetwork>
  evmNetworksWithoutTestnetsMap: Record<EvmNetworkId, EvmNetwork>
  tokensWithTestnetsMap: Record<TokenId, Token>
  tokensWithoutTestnetsMap: Record<TokenId, Token>
  tokenRatesMap: Record<TokenId, TokenRates>

  balances: BalanceJson[]
  balancesMeta: { subscriptionId: string | undefined }
}

const DEFAULT_VALUE: DbCache = {
  chainsWithTestnets: [],
  chainsWithoutTestnets: [],
  evmNetworksWithTestnets: [],
  evmNetworksWithoutTestnets: [],
  tokensWithTestnets: [],
  tokensWithoutTestnets: [],

  chainsWithTestnetsMap: {},
  chainsWithoutTestnetsMap: {},
  evmNetworksWithTestnetsMap: {},
  evmNetworksWithoutTestnetsMap: {},
  tokensWithTestnetsMap: {},
  tokensWithoutTestnetsMap: {},
  tokenRatesMap: {},

  balances: [],
  balancesMeta: { subscriptionId: undefined },
}

const consolidateDbCache = (
  chainsMap?: ChainList,
  evmNetworksMap?: EvmNetworkList,
  tokensMap?: TokenList,
  tokenRates?: DbTokenRates[],
  allBalances?: BalanceJson[],
  meta?: Array<{ id: string; value: string }>
): DbCache => {
  if (!chainsMap || !evmNetworksMap || !tokensMap || !allBalances || !tokenRates)
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
    .filter(([mirrorToken]) => tokensMap[mirrorToken])
    .forEach(([mirrorToken, mirrorOf]) => ((tokensMap[mirrorToken] as any).mirrorOf = mirrorOf))
  // END: temp hack

  const chainsWithTestnets = Object.values(chainsMap)
  const chainsWithoutTestnets = chainsWithTestnets.filter(filterNoTestnet)
  const chainsWithoutTestnetsMap = Object.fromEntries(
    chainsWithoutTestnets.map((network) => [network.id, network])
  )

  const evmNetworksWithTestnets = Object.values(evmNetworksMap)
  const evmNetworksWithoutTestnets = evmNetworksWithTestnets.filter(filterNoTestnet)
  const evmNetworksWithoutTestnetsMap = Object.fromEntries(
    evmNetworksWithoutTestnets.map((network) => [network.id, network])
  )

  // ensure that we have corresponding network for each token
  const tokensWithTestnets = Object.values(tokensMap).filter(
    (token) =>
      (token.chain && chainsMap[token.chain.id]) ||
      (token.evmNetwork && evmNetworksMap[token.evmNetwork.id])
  )
  const tokensWithoutTestnets = tokensWithTestnets
    .filter(filterNoTestnet)
    .filter(
      (token) =>
        (token.chain && chainsWithoutTestnetsMap[token.chain.id]) ||
        (token.evmNetwork && evmNetworksWithoutTestnetsMap[token.evmNetwork.id])
    )
  const tokensWithTestnetsMap = Object.fromEntries(
    tokensWithTestnets.map((token) => [token.id, token])
  )
  const tokensWithoutTestnetsMap = Object.fromEntries(
    tokensWithoutTestnets.map((token) => [token.id, token])
  )

  const tokenRatesMap = Object.fromEntries(tokenRates.map(({ tokenId, rates }) => [tokenId, rates]))

  // return only balances for which we have a token
  // note that db only contains testnet balances if useTestnets setting is turned on, they are deleted as soon as settings is turned off.
  const balances = allBalances.filter((b) => tokensWithTestnetsMap[b.tokenId])

  const balancesMeta = { subscriptionId: meta?.find(({ id }) => id === "subscriptionId")?.value }

  return {
    chainsWithTestnets,
    chainsWithoutTestnets,
    evmNetworksWithTestnets,
    evmNetworksWithoutTestnets,
    tokensWithTestnets,
    tokensWithoutTestnets,

    chainsWithTestnetsMap: chainsMap,
    chainsWithoutTestnetsMap,
    evmNetworksWithTestnetsMap: evmNetworksMap,
    evmNetworksWithoutTestnetsMap,
    tokensWithTestnetsMap,
    tokensWithoutTestnetsMap,
    tokenRatesMap,

    balances,
    balancesMeta,
  }
}

const useDbCacheProvider = (): DbCache => {
  const chainList = useLiveQuery(() => chaindataProvider.chains(), [])
  const evmNetworkList = useLiveQuery(() => chaindataProvider.evmNetworks(), [])
  const tokenList = useLiveQuery(() => chaindataProvider.tokens(), [])
  const tokenRates = useLiveQuery(() => db.tokenRates.toArray(), [])
  const rawBalances = useLiveQuery(() => balancesDb.balances.toArray(), [])
  const meta = useLiveQuery(() => balancesDb.meta.toArray(), [])

  const [dbData, setDbData] = useState(DEFAULT_VALUE)

  // debounce every 500ms to prevent hammering UI with updates
  useDebounce(
    () => {
      setDbData(
        consolidateDbCache(chainList, evmNetworkList, tokenList, tokenRates, rawBalances, meta)
      )
    },
    500,
    [chainList, evmNetworkList, tokenList, tokenRates, rawBalances, meta]
  )

  const refInitialized = useRef(false)

  // force an update as soon as all datasources are fetched, so UI can display data ASAP
  useEffect(() => {
    if (
      !refInitialized.current &&
      chainList &&
      evmNetworkList &&
      tokenList &&
      tokenRates &&
      rawBalances &&
      meta
    ) {
      setDbData(
        consolidateDbCache(chainList, evmNetworkList, tokenList, tokenRates, rawBalances, meta)
      )
      refInitialized.current = true
    }
  }, [chainList, evmNetworkList, tokenList, tokenRates, rawBalances, meta])

  return dbData
}

export const [DbCacheProvider, useDbCache] = provideContext(useDbCacheProvider)
