import { NetworkId, TokenId } from "@talismn/chaindata-provider"
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

export const useNetworks = () => useAtomValue(networksAtom)
export const useNetworksById = () => useAtomValue(networksByIdAtom)
export const useDotNetworksByGenesisHash = () => useAtomValue(dotNetworksByGenesisHashAtom)
export const useNetwork = (networkId?: NetworkId) =>
  useAtomValue(networksByIdAtom)[networkId ?? ""] ?? null

export const useTokens = () => useAtomValue(tokensAtom)
export const useTokensById = () => useAtomValue(tokensByIdAtom)
export const useToken = (tokenId?: TokenId) => useAtomValue(tokensByIdAtom)[tokenId ?? ""] ?? null
