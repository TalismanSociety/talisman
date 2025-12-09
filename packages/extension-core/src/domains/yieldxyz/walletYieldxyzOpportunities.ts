import { Token, TokenId } from "@talismn/chaindata-provider"
import { getLoadableQuery$, isNotNil, keepAlive, Loadable } from "@talismn/util"
import { log } from "extension-shared"
import { isEqual, uniq } from "lodash-es"
import {
  combineLatest,
  concatMap,
  defer,
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
  take,
  tap,
} from "rxjs"

import { chaindataProvider } from "../../rpcs/chaindata"
import { remoteConfigStore } from "../app/store.remoteConfig"
import { walletBalances$ } from "../balances/walletBalances"
import { YieldDto } from "./exports"
import { fetchAllYieldxyzProductOpportunities } from "./getYieldxyzProductOpportunities"
import { getTalismanNetworkIdToYieldxyzNetworkIdMap } from "./helpers"
import {
  updateYieldxyzOpportunitiesStore,
  yieldxyzOpportunitiesStore$,
} from "./store.opportunities"

const REFRESH_INTERVAL = 30_000
const KEEP_ALIVE = 3_000

const tokenIds$ = walletBalances$.pipe(
  map((balances) => uniq(balances.balances.map((b) => b.tokenId)).sort()),
  distinctUntilChanged<TokenId[]>(isEqual),
)

const getTokenAddressOrSymbol = (token: Token) => {
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

export const walletYieldxyzOpportunities$ = defer(() =>
  yieldxyzOpportunitiesStore$.pipe(
    take(1),
    concatMap((defaultValue) =>
      combineLatest([
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

                const addressOrSymbol = getTokenAddressOrSymbol(token)
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
          getLoadableQuery$({
            namespace: "walletYieldOpportunities$",
            args: [networks, inputTokens] as const,
            queryFn: ([nets, tokens], signal) =>
              fetchAllYieldxyzProductOpportunities({ networks: nets, inputTokens: tokens, signal }),
            refreshInterval: REFRESH_INTERVAL,
            defaultValue,
          }),
        ),
        tap({
          next: (opportunities) => {
            if (opportunities.status === "success")
              updateYieldxyzOpportunitiesStore(opportunities.data)
          },
        }),
        startWith({
          status: "loading",
          data: defaultValue,
        } as Loadable<YieldDto[]>),
      ),
    ),
    distinctUntilChanged<Loadable<YieldDto[]>>(isEqual),
    tap({
      next: (val) => log.debug("[yield.xyz] yield opportunities emitted", val),
      subscribe: () => log.debug("[yield.xyz] starting yield opportunities subscription"),
      unsubscribe: () => log.debug("[yield.xyz] stopping yield opportunities subscription"),
    }),
    shareReplay({ refCount: true, bufferSize: 1 }),
    keepAlive(KEEP_ALIVE),
  ),
)
