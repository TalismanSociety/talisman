import { ChainId, EvmNetworkId, TokenId } from "@talismn/chaindata-provider"
import { useAtomValue } from "jotai"

import {
  chaindataAtom,
  chainsByGenesisHashAtom,
  chainsByIdAtom,
  evmNetworksByIdAtom,
  miniMetadatasAtom,
  tokensByIdAtom,
} from "../atoms/chaindata"
import { chaindataProviderAtom } from "../atoms/chaindataProvider"

export const useChaindataProvider = () => useAtomValue(chaindataProviderAtom)
export const useChaindata = () => useAtomValue(chaindataAtom)

export const useChains = () => useAtomValue(chainsByIdAtom)
export const useChainsByGenesisHash = () => useAtomValue(chainsByGenesisHashAtom)
export const useEvmNetworks = () => useAtomValue(evmNetworksByIdAtom)
export const useTokens = () => useAtomValue(tokensByIdAtom)
export const useMiniMetadatas = () => useAtomValue(miniMetadatasAtom)

export const useChain = (chainId?: ChainId) => useChains()[chainId ?? ""] ?? undefined
export const useEvmNetwork = (evmNetworkId?: EvmNetworkId) =>
  useEvmNetworks()[evmNetworkId ?? ""] ?? undefined
export const useToken = (tokenId?: TokenId) => useTokens()[tokenId ?? ""] ?? undefined
