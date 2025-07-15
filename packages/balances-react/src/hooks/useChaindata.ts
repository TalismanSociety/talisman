import { NetworkId, TokenId } from "@talismn/chaindata-provider"
import { useAtomValue } from "jotai"
import { keyBy } from "lodash-es"
import { useMemo } from "react"

import { chaindataAtom } from "../atoms/chaindata"
import { chaindataProviderAtom } from "../atoms/chaindataProvider"

export const useChaindataProvider = () => useAtomValue(chaindataProviderAtom)
export const useChaindata = () => useAtomValue(chaindataAtom)

export const useNetworks = () => useChaindata().networks
export const useNetworksById = () => {
  const { networks } = useChaindata()
  return useMemo(() => keyBy(networks, (n) => n.id), [networks])
}
export const useNetwork = (networkId?: NetworkId) => {
  const networksById = useNetworksById()
  return networksById[networkId ?? ""] ?? null
}

export const useTokens = () => useChaindata().tokens
export const useTokensById = () => {
  const { tokens } = useChaindata()
  return useMemo(() => keyBy(tokens, (t) => t.id), [tokens])
}
export const useToken = (tokenId?: TokenId) => {
  const tokensById = useTokensById()
  return tokensById[tokenId ?? ""] ?? null
}
