import { db } from "@core/db"
import { chaindataProvider } from "@core/rpcs/chaindata"
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
import { liveQuery } from "dexie"
import { atom } from "recoil"
import { combineLatest, debounceTime, first, merge } from "rxjs"

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

  balances: BalanceJson[]
  tokenRatesMap: Record<TokenId, TokenRates>
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

  balances: [],

  tokenRatesMap: {},
}

const consolidateDbCache = (
  chainsMap?: ChainList,
  evmNetworksMap?: EvmNetworkList,
  tokensMap?: TokenList,
  allBalances?: BalanceJson[],
  tokenRates?: DbTokenRates[]
): DbCache => {
  if (!chainsMap || !evmNetworksMap || !tokensMap || !allBalances || !tokenRates)
    return DEFAULT_VALUE

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

  // return only balances for which we have a token
  // note that db only contains testnet balances if useTestnets setting is turned on, they are deleted as soon as settings is turned off.
  const balances = allBalances.filter((b) => tokensWithTestnetsMap[b.tokenId])

  const tokenRatesMap = Object.fromEntries(tokenRates.map(({ tokenId, rates }) => [tokenId, rates]))

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

    balances,

    tokenRatesMap,
  }
}

const getTokensList = async () => {
  const tokens = await chaindataProvider.tokens()

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
    .filter(([mirrorToken]) => tokens[mirrorToken])
    .forEach(([mirrorToken, mirrorOf]) => ((tokens[mirrorToken] as any).mirrorOf = mirrorOf))

  return tokens
}

export const dbCacheState = atom<DbCache>({
  key: "dbCacheState",
  default: DEFAULT_VALUE,
  effects: [
    ({ setSelf }) => {
      const observable = combineLatest({
        chainList: liveQuery(() => chaindataProvider.chains()),
        evmNetworkList: liveQuery(() => chaindataProvider.evmNetworks()),
        tokenList: liveQuery(() => getTokensList()),
        rawBalances: liveQuery(() => balancesDb.balances.toArray()),
        tokenRates: liveQuery(() => db.tokenRates.toArray()),
      })

      // subscribe both to first return value and to debounced changes
      const sub = merge(observable.pipe(first()), observable.pipe(debounceTime(500))).subscribe(
        ({ chainList, evmNetworkList, tokenList, rawBalances, tokenRates }) => {
          setSelf(consolidateDbCache(chainList, evmNetworkList, tokenList, rawBalances, tokenRates))
        }
      )

      return () => {
        sub.unsubscribe()
      }
    },
  ],
})
