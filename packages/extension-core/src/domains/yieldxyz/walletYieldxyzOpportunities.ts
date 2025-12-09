import { Token, TokenId } from "@talismn/chaindata-provider"
import { isNotNil, keepAlive, Loadable } from "@talismn/util"
import { isEqual, uniq } from "lodash-es"
import {
  combineLatest,
  concatMap,
  defer,
  distinctUntilChanged,
  map,
  shareReplay,
  switchMap,
  take,
  tap,
} from "rxjs"

import { chaindataProvider } from "../../rpcs/chaindata"
import { remoteConfigStore } from "../app/store.remoteConfig"
import { walletBalances$ } from "../balances/walletBalances"
import { YieldDto } from "./exports"
import { getYieldxyzProductOpportunities$ } from "./getYieldxyzProductOpportunities"
import { getTalismanNetworkIdToYieldxyzNetworkIdMap } from "./helpers"
import {
  updateYieldxyzOpportunitiesStore,
  yieldxyzOpportunitiesStore$,
} from "./store.opportunities"

const KEEP_ALIVE = 3_000

const tokenIds$ = walletBalances$.pipe(
  map((balances) => uniq(balances.balances.map((b) => b.tokenId)).sort()),
  distinctUntilChanged<TokenId[]>(isEqual),
)

const getTokenAddressOrSynbol = (token: Token) => {
  switch (token.type) {
    case "evm-erc20":
      return token.contractAddress
    case "sol-spl":
      return token.mintAddress
    // some other token types have addresses but not sure if yieldxyz supports them
    default:
      return token.symbol
  }
}

const liveWalletYieldxyzOpportunities$ = combineLatest([
  chaindataProvider.getTokensMapById$(),
  tokenIds$,
  remoteConfigStore.observable,
]).pipe(
  map(([tokensMap, tokenIds, remoteConfig]) => {
    const toYieldxyzNetworkIdMap = getTalismanNetworkIdToYieldxyzNetworkIdMap(remoteConfig)
    const tokens = tokenIds.map((tokenId) => tokensMap[tokenId]).filter(isNotNil)

    return tokens.reduce<{ networks: string[]; inputTokens: string[] }>(
      (acc, token) => {
        const network = toYieldxyzNetworkIdMap[token.networkId]
        if (network) {
          if (!acc.networks.includes(network)) acc.networks.push(network)

          const addressOrSymbol = getTokenAddressOrSynbol(token)
          if (addressOrSymbol && !acc.inputTokens.includes(addressOrSymbol))
            acc.inputTokens.push(addressOrSymbol)
        }

        return acc
      },
      {
        networks: [], // yieldxyz netwrork ids
        inputTokens: [], // symbol for native tokens, addresses for ERC20 and SPL - unused atm
      },
    )
  }),
  switchMap(({ networks, inputTokens }) =>
    getYieldxyzProductOpportunities$({ networks, inputTokens }),
  ),
  tap({
    next: (opportunities) => {
      if (opportunities.status === "success") updateYieldxyzOpportunitiesStore(opportunities.data)
    },
  }),
)

export const walletYieldxyzOpportunities$ = defer(() =>
  yieldxyzOpportunitiesStore$.pipe(
    take(1),
    concatMap((defaultValue) =>
      liveWalletYieldxyzOpportunities$.pipe(
        map((opportunities) =>
          opportunities.status === "success"
            ? opportunities
            : ({ status: "loading", data: defaultValue } as Loadable<YieldDto[]>),
        ),
      ),
    ),
    distinctUntilChanged<Loadable<YieldDto[]>>(isEqual),
    shareReplay({ refCount: true, bufferSize: 1 }),
    keepAlive(KEEP_ALIVE),
  ),
)
