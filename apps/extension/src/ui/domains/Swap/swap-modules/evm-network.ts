import { getExtensionPublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { getNetworkById$, getToken$ } from "@ui/state/chaindata"
import { firstValueFrom } from "rxjs"
import type { PublicClient } from "viem"

export const getEvmNetwork = async (evmNetworkId: string) => {
  const network = await firstValueFrom(getNetworkById$(evmNetworkId))
  if (network?.platform !== "ethereum") throw new Error("Unknown EVM network")
  return network
}

export const getEvmPublicClient = async (evmNetworkId: string): Promise<PublicClient> =>
  getExtensionPublicClient(await getEvmNetwork(evmNetworkId))

/** undefined for unknown networks and networks without an evm-native token */
export const findEvmPublicClient = async (evmNetworkId: string | undefined) => {
  if (!evmNetworkId) return undefined
  const evmNetwork = await firstValueFrom(getNetworkById$(evmNetworkId))
  const nativeToken = await firstValueFrom(getToken$(evmNetwork?.nativeTokenId))
  if (!evmNetwork || nativeToken?.type !== "evm-native" || evmNetwork.platform !== "ethereum")
    return undefined
  return getExtensionPublicClient(evmNetwork)
}
