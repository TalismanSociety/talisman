import {
  Network,
  NetworkId,
  NetworkList,
  Token,
  TokenId,
  TokenList,
} from "@talismn/chaindata-provider"
import { useAtomValue } from "jotai"
import { keyBy } from "lodash-es"
import { useMemo } from "react"

import { chaindataAtom } from "../atoms/chaindata"
import { chaindataProviderAtom } from "../atoms/chaindataProvider"

export const useChaindataProvider = () => useAtomValue(chaindataProviderAtom)
export const useChaindata = () => useAtomValue(chaindataAtom)

export const useNetworks = (): Network[] => useChaindata().networks
export const useNetworksById = (): NetworkList => {
  const { networks } = useChaindata()
  return useMemo(() => keyBy(networks, (n) => n.id), [networks])
}
export const useNetwork = (networkId?: NetworkId): Network | null => {
  const networksById = useNetworksById()
  return networksById[networkId ?? ""] ?? null
}

export const useTokens = (): Token[] => useChaindata().tokens
export const useTokensById = (): TokenList => {
  const { tokens } = useChaindata()
  return useMemo(() => keyBy(tokens, (t) => t.id), [tokens])
}
export const useToken = (tokenId?: TokenId): Token | null => {
  const tokensById = useTokensById()
  return tokensById[tokenId ?? ""] ?? null
}
