import {
  CustomChaindata,
  CustomChaindataSchema,
  Network,
  NetworkId,
  Token,
  TokenId,
} from "@talismn/chaindata-provider"
import { assign, keyBy, values } from "lodash"

import { StorageProvider } from "../../libs/Store"

const DEFAULT_DATA: CustomChaindata = { networks: [], tokens: [] }

class CustomChaindataStore extends StorageProvider<CustomChaindata> {}

const store = new CustomChaindataStore("customChaindata", DEFAULT_DATA)

const upsert = async (networks: Network[], tokens: Token[]) =>
  store.mutate((prev) => {
    const next = {
      networks: networks.length
        ? values(assign(keyBy(prev.networks, "id"), keyBy(networks, "id")))
        : prev.networks,
      tokens: tokens.length
        ? values(assign(keyBy(prev.tokens, "id"), keyBy(tokens, "id")))
        : prev.tokens,
    }
    return CustomChaindataSchema.parse(next)
  })

const remove = (networkIds: NetworkId[], tokenIds: TokenId[]) =>
  store.mutate((prev) => {
    const next = {
      networks: networkIds.length
        ? (prev.networks?.filter(({ id }) => !networkIds.includes(id)) ?? [])
        : prev.networks,
      tokens: tokenIds.length
        ? prev.tokens.filter(({ id }) => !tokenIds.includes(id))
        : prev.tokens,
    }
    return CustomChaindataSchema.parse(next)
  })

export const customChaindataStore = {
  /** data source for wallet's chaindataProvider */
  observable$: store.observable.asObservable(),

  upsert,
  remove,
  upsertToken: (token: Token) => upsert([], [token]),
  upsertNetwork: (network: Network) => upsert([network], []),
  removeToken: (tokenId: TokenId) => remove([], [tokenId]),
  removeNetwork: (networkId: NetworkId) => remove([networkId], []),
}
