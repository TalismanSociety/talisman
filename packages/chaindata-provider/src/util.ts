import { firstValueFrom, Observable } from "rxjs"

import { DotNetwork, EthNetwork, Token } from "./chaindata"
import { githubChaindataBaseUrl, githubChaindataTokensAssetsDir } from "./constants"
import { Chain, CustomChain, CustomEvmNetwork, EvmNetwork, SimpleEvmNetwork } from "./types"

//
// map from Item[] to another type
//

export const itemsToIds = <T extends { id: string }>(items: T[]): string[] =>
  items.map(({ id }) => id)

export const itemsToMapById = <T extends { id: string }>(items: T[]): Record<string, T> =>
  Object.fromEntries(items.map((item) => [item.id, item]))

export const itemsToMapByGenesisHash = <T extends { genesisHash: string | null }>(
  items: T[],
): Record<string, T> =>
  Object.fromEntries(items.flatMap((item) => (item.genesisHash ? [[item.genesisHash, item]] : [])))

//
// filters for Item[] where Item.isCustom == true
//

export const customChainsFilter = (chains: Array<Chain | CustomChain>) =>
  chains.filter((chain): chain is CustomChain => "isCustom" in chain && chain.isCustom)

export const customEvmNetworksFilter = (evmNetworks: Array<EvmNetwork | CustomEvmNetwork>) =>
  evmNetworks.filter(
    (evmNetwork): evmNetwork is CustomEvmNetwork => "isCustom" in evmNetwork && evmNetwork.isCustom,
  )

export const customTokensFilter = (tokens: Token[]) =>
  tokens.filter((token) => "isCustom" in token && token.isCustom)

//
// Utils to wrap Observable methods with one-shot Promise methods
//

type ObservableReturnType<O> = O extends Observable<infer T> ? T : O

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const wrapObservableWithGetter = async <O extends Observable<any>>(
  errorReason: string,
  observable: O,
): Promise<ObservableReturnType<O>> => {
  return await withErrorReason(errorReason, () => firstValueFrom(observable))
}

export const withErrorReason = async <T>(
  reason: string,
  task: () => Promise<T> | T,
): Promise<T> => {
  try {
    return await task()
  } catch (cause) {
    throw new Error(reason, { cause })
  }
}

type KNOWN_TOKEN_ID = "uniswap"

export const getGithubTokenLogoUrl = (tokenId: KNOWN_TOKEN_ID): string => {
  return `${githubChaindataBaseUrl}/${githubChaindataTokensAssetsDir}/${tokenId}.svg`
}

/**
 * Use only if you are sure this token is supported by Talisman or the url might 404
 * @param coingeckoId
 * @returns
 */
export const getGithubTokenLogoUrlByCoingeckoId = (coingeckoId: string): string => {
  return `${githubChaindataBaseUrl}/assets/tokens/coingecko/${coingeckoId}.webp`
}

//
// Utils which aren't used by this package, but are helpful for other packages
//

/** @deprecated */
export const isCustomChain = (chain: Chain | CustomChain | DotNetwork): chain is CustomChain => {
  return "isCustom" in chain && chain.isCustom === true
}

/** @deprecated */
export const isCustomEvmNetwork = (
  evmNetwork: EvmNetwork | CustomEvmNetwork | SimpleEvmNetwork | EthNetwork,
): evmNetwork is CustomEvmNetwork => {
  return "isCustom" in evmNetwork && evmNetwork.isCustom === true
}
