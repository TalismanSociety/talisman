import {
  DotNetwork,
  Network,
  NetworkId,
  NetworkList,
  Token,
  TokenId,
  TokenList,
} from "@talismn/chaindata-provider"
import { useAtomValue } from "jotai"

import {
  chaindataAtom,
  dotNetworksByGenesisHashAtom,
  networksAtom,
  networksByIdAtom,
  tokensAtom,
  tokensByIdAtom,
} from "../atoms/chaindata"
import { chaindataProviderAtom } from "../atoms/chaindataProvider"

export const useChaindataProvider = () => useAtomValue(chaindataProviderAtom)
export const useChaindata = () => useAtomValue(chaindataAtom)

export const useNetworks = (): Network[] => useAtomValue(networksAtom)
export const useNetworksById = (): NetworkList => useAtomValue(networksByIdAtom)
export const useDotNetworksByGenesisHash = (): Record<string, DotNetwork> =>
  useAtomValue(dotNetworksByGenesisHashAtom)
export const useNetwork = (networkId?: NetworkId): Network | null =>
  useAtomValue(networksByIdAtom)[networkId ?? ""] ?? null

export const useTokens = (): Token[] => useAtomValue(tokensAtom)
export const useTokensById = (): TokenList => useAtomValue(tokensByIdAtom)
export const useToken = (tokenId?: TokenId): Token | null =>
  useAtomValue(tokensByIdAtom)[tokenId ?? ""] ?? null
