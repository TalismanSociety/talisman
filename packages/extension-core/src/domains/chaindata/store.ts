import {
  CustomChaindata,
  CustomChaindataSchema,
  getCleanNetwork,
  getCleanToken,
  NativeToken,
  Network,
  NetworkId,
  Token,
  TokenId,
} from "@talismn/chaindata-provider"
import { assign, keyBy, values } from "lodash-es"

import { StorageProvider } from "../../libs/Store"

const DEFAULT_DATA: CustomChaindata = { networks: [], tokens: [] }

class CustomChaindataStore extends StorageProvider<CustomChaindata> {}

const store = new CustomChaindataStore("customChaindata", DEFAULT_DATA)

const upsert = async (networks: Network[], tokens: Token[]) =>
  store.mutate((prev) => {
    const next = {
      networks: networks.length
        ? values(assign(keyBy(prev.networks, "id"), keyBy(networks.map(getCleanNetwork), "id")))
        : prev.networks,
      tokens: tokens.length
        ? values(assign(keyBy(prev.tokens, "id"), keyBy(tokens.map(getCleanToken), "id")))
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
  upsertNetwork: (network: Network, nativeToken: NativeToken) => upsert([network], [nativeToken]),
  removeToken: (tokenId: TokenId) => remove([], [tokenId]),
  removeNetwork: async (networkId: NetworkId) => {
    const { networks } = await store.get()
    const network = networks?.find(({ id }) => id === networkId)
    const tokenIds = network?.nativeTokenId ? [network.nativeTokenId] : []
    remove([networkId], tokenIds)
  },
}
