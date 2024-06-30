import { firstValueFrom, Observable } from "rxjs"

import { Chain, CustomChain, CustomEvmNetwork, EvmNetwork, Token } from "./types"

/**
 * Util to add our onfinality api key to any public onfinality RPC urls in an array of chains.
 */
export const addCustomChainRpcs = (chains: Chain[], onfinalityApiKey?: string): Chain[] =>
  chains.map((chain) => {
    // copy chain instead of mutating
    const chainWithCustomRpcs = { ...chain }

    if (typeof onfinalityApiKey !== "string" || !onfinalityApiKey) return chainWithCustomRpcs

    // add rpcs
    chainWithCustomRpcs.rpcs = (chainWithCustomRpcs.rpcs || [])
      // convert public onfinality rpc endpoints to private onfinality rpc endpoints
      .map((rpc) => {
        rpc.url = rpc.url.replace(
          /^wss:\/\/([A-z-]+)\.api\.onfinality\.io\/public-ws\/?$/,
          `wss://$1.api.onfinality.io/ws?apikey=${onfinalityApiKey}`
        )
        return rpc
      })
      // prioritise onfinality rpcs
      .sort((a, b) => {
        if (a.url.includes("api.onfinality.io")) return -1
        if (b.url.includes("api.onfinality.io")) return 1
        return 0
      })

    // return copy
    return chainWithCustomRpcs
  })

//
// Utils for parsing chaindata tokens.json
//

export const parseTokensResponse = (tokens: Token[]): Token[] =>
  tokens.filter(isTokenPartial).filter(isToken)

export const isTokenPartial = (token: unknown): token is Partial<Token> =>
  typeof token === "object" && token !== null

export const isToken = (token: Partial<Token>): token is Token => {
  const id = token.id
  if (typeof id !== "string") return false

  const type = token.type
  if (typeof type !== "string") return false

  const isTestnet = token.isTestnet
  if (typeof isTestnet !== "boolean") return false

  const symbol = token.symbol
  if (typeof symbol !== "string") return false

  const decimals = token.decimals
  if (typeof decimals !== "number") return false

  const logo = token.logo
  if (typeof logo !== "string") return false

  // coingeckoId can be undefined
  // const coingeckoId = token.coingeckoId
  // if (typeof coingeckoId !== "string") return false

  return true
}

//
// map from Item[] to another type
//

export const itemsToIds = <T extends { id: string }>(items: T[]): string[] =>
  items.map(({ id }) => id)

export const itemsToMapById = <T extends { id: string }>(items: T[]): Record<string, T> =>
  Object.fromEntries(items.map((item) => [item.id, item]))

export const itemsToMapByGenesisHash = <T extends { genesisHash: string | null }>(
  items: T[]
): Record<string, T> =>
  Object.fromEntries(items.flatMap((item) => (item.genesisHash ? [[item.genesisHash, item]] : [])))

//
// filters for Item[] where Item.isCustom == true
//

export const customChainsFilter = (chains: Array<Chain | CustomChain>) =>
  chains.filter((chain): chain is CustomChain => "isCustom" in chain && chain.isCustom)

export const customEvmNetworksFilter = (evmNetworks: Array<EvmNetwork | CustomEvmNetwork>) =>
  evmNetworks.filter(
    (evmNetwork): evmNetwork is CustomEvmNetwork => "isCustom" in evmNetwork && evmNetwork.isCustom
  )

export const customTokensFilter = (tokens: Token[]) =>
  tokens.filter((token) => "isCustom" in token && token.isCustom)

//
// Utils to Observable methods with one-shot Promise methods
//

type ObservableReturnType<O> = O extends Observable<infer T> ? T : O

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const wrapObservableWithGetter = async <O extends Observable<any>>(
  errorReason: string,
  observable: O
): Promise<ObservableReturnType<O>> => {
  return await withErrorReason(errorReason, () => firstValueFrom(observable))
}

export const withErrorReason = <T>(reason: string, task: () => T): T => {
  try {
    return task()
  } catch (cause) {
    throw new Error(reason, { cause })
  }
}

//
// Utils which aren't used by this package, but are helpful for other packages
//

export const isCustomChain = (chain: Chain | CustomChain): chain is CustomChain => {
  return "isCustom" in chain && chain.isCustom === true
}

export const isCustomEvmNetwork = (
  evmNetwork: EvmNetwork | CustomEvmNetwork
): evmNetwork is CustomEvmNetwork => {
  return "isCustom" in evmNetwork && evmNetwork.isCustom === true
}
