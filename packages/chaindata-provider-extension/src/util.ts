import {
  Chain,
  CustomChain,
  CustomEvmNetwork,
  EvmNetwork,
  Token,
} from "@talismn/chaindata-provider"
import { Observable, firstValueFrom } from "rxjs"

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
