import { Token, TokenId } from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { isEqual, uniq } from "lodash-es"
import { combineLatest, distinctUntilChanged, map, switchMap } from "rxjs"

import { chaindataProvider } from "../../rpcs/chaindata"
import { remoteConfigStore } from "../app/store.remoteConfig"
import { walletBalances$ } from "../balances/walletBalances"
import { getYieldxyzProductOpportunities$ } from "./getYieldxyzProductOpportunities"
import { getTalismanNetworkIdToYieldxyzNetworkIdMap } from "./helpers"

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

export const walletYieldxyzOpportunities$ = combineLatest([
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
        inputTokens: [], // symbol for native tokens, addresses for ERC20 and SPL
      },
    )
  }),
  switchMap(({ networks, inputTokens }) =>
    getYieldxyzProductOpportunities$({ networks, inputTokens }),
  ),
)
