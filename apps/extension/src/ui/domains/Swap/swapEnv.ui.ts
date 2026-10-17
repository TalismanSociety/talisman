import { getMetadataRpcFromDef } from "@core/domains/metadata/helpers"
import type { SwapEnv } from "@core/domains/swaps/env"
import type { BackgroundSwapModule } from "@core/domains/swaps/types"
import type { NetworkId } from "@talismn/chaindata-provider"
import { getScaleApi, type ScaleApi } from "@talismn/sapi"
import { api } from "@ui/api"
import { getNetworkById$, getToken$ } from "@ui/state/chaindata"
import { firstValueFrom } from "rxjs"

import type { SwapModule } from "./swap-modules/common.swap-module"
import { getEvmPublicClient } from "./swap-modules/evm-network"

const createSubstrateApi = async (networkId: NetworkId): Promise<ScaleApi> => {
  const network = await firstValueFrom(getNetworkById$(networkId))
  if (network?.platform !== "polkadot") throw new Error("Unknown substrate network")

  const nativeToken = await firstValueFrom(getToken$(network.nativeTokenId))
  if (!nativeToken) throw new Error("Missing native token")

  const metadataDef = await api.subChainMetadata(network.genesisHash)
  const metadataRpc = getMetadataRpcFromDef(metadataDef)
  if (!metadataRpc) throw new Error("Missing metadata")

  return getScaleApi(
    { chainId: network.id, send: (...args) => api.subSend(network.id, ...args) },
    metadataRpc as `0x${string}`,
    nativeToken,
    network.hasCheckMetadataHash,
    network.signedExtensions,
    network.registryTypes
  )
}

const createUiSwapEnv = (): SwapEnv => {
  const substrateApis = new Map<NetworkId, Promise<ScaleApi>>()

  return {
    getNetwork: (networkId) => firstValueFrom(getNetworkById$(networkId)),
    getToken: (tokenId) => firstValueFrom(getToken$(tokenId)),
    evmClient: getEvmPublicClient,
    substrateApi: (networkId) => {
      const cached = substrateApis.get(networkId)
      if (cached) return cached

      const created = createSubstrateApi(networkId).catch((err) => {
        substrateApis.delete(networkId)
        throw err
      })
      substrateApis.set(networkId, created)
      return created
    },
  }
}

export const uiSwapEnv = createUiSwapEnv()

export const withSwapEnv = (module: BackgroundSwapModule, env: SwapEnv): SwapModule => ({
  ...module,
  getQuote: (params, signal) => module.getQuote(params, env, signal),
  buildLeg: (params) => module.buildLeg(params, env),
})
