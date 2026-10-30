import { gandalfFetch } from "@core/domains/gandalf/fetch"
import { getMetadataDef } from "@core/domains/metadata/getMetadataDef"
import { getMetadataRpcFromDef } from "@core/domains/metadata/helpers"
import {
  buildSystemEventsDecoder,
  type DecodeSystemEvents,
  findExtrinsicEvents,
} from "@core/domains/transactions/extrinsicEvents"
import { chainConnectorDot } from "@core/rpcs/chain-connector-dot"
import { chainConnectorEvm } from "@core/rpcs/chain-connector-evm"
import { chaindataProvider } from "@core/rpcs/chaindata"
import type { DotNetwork, NetworkId } from "@talismn/chaindata-provider"
import { getScaleApi, type ScaleApi } from "@talismn/sapi"
import type { Hex } from "viem"

import type { SwapEnv } from "./env"
import { memoiseByKey } from "./helpers"

const getSubstrateNetwork = async (networkId: NetworkId) => {
  const network = await chaindataProvider.getNetworkById(networkId, "polkadot")
  if (!network) throw new Error("Unknown substrate network")
  return network
}

const getMetadataRpc = async (genesisHash: `0x${string}`) => {
  const metadataDef = await getMetadataDef(genesisHash)
  const metadataRpc = getMetadataRpcFromDef(metadataDef)
  if (!metadataRpc || !metadataDef) throw new Error("Missing metadata")
  return { metadataRpc: metadataRpc as `0x${string}`, specVersion: metadataDef.specVersion }
}

const createSubstrateApi = async (networkId: NetworkId): Promise<ScaleApi> => {
  const network = await getSubstrateNetwork(networkId)
  const nativeToken = await chaindataProvider.getTokenById(network.nativeTokenId)
  if (!nativeToken) throw new Error("Missing native token")
  const { metadataRpc } = await getMetadataRpc(network.genesisHash)

  return getScaleApi(
    {
      chainId: network.id,
      send: (method, params, isCacheable) =>
        chainConnectorDot.send(network.id, method, params, isCacheable),
    },
    metadataRpc,
    nativeToken,
    network.hasCheckMetadataHash,
    network.signedExtensions,
    network.registryTypes
  )
}

const substrateApi = memoiseByKey(createSubstrateApi)

/** one decoder per runtime: a runtime upgrade changes the events layout */
const systemEventsDecoders = new Map<string, DecodeSystemEvents>()

/** the decoder of the runtime at the parent block, which executed the block even when it installs another */
const parentRuntimeEventsDecoder = async (network: DotNetwork, parentHash: Hex) => {
  const { specVersion } = await chainConnectorDot.send<{ specVersion: number }>(
    network.id,
    "state_getRuntimeVersion",
    [parentHash],
    true
  )
  const key = `${network.id}:${specVersion}`
  const cached = systemEventsDecoders.get(key)
  if (cached) return cached

  const current = await getMetadataRpc(network.genesisHash)
  const metadataRpc =
    current.specVersion === specVersion
      ? current.metadataRpc
      : await chainConnectorDot.send<Hex>(network.id, "state_getMetadata", [parentHash], true)
  const decoder = buildSystemEventsDecoder(metadataRpc)
  systemEventsDecoders.set(key, decoder)
  return decoder
}

export const coreSwapEnv: SwapEnv = {
  getNetwork: (networkId) => chaindataProvider.getNetworkById(networkId),
  getToken: (tokenId) => chaindataProvider.getTokenById(tokenId),
  evmClient: async (networkId) => {
    const client = await chainConnectorEvm.getPublicClientForEvmNetwork(networkId)
    if (!client) throw new Error("Unknown EVM network")
    return client
  },
  substrateApi,
  substrateSend: (networkId, method, params) => chainConnectorDot.send(networkId, method, params),
  decodeExtrinsicEvents: async (networkId, blockHash, extrinsicHash) => {
    const network = await getSubstrateNetwork(networkId)
    const found = await findExtrinsicEvents(
      network.id,
      (parentHash) => parentRuntimeEventsDecoder(network, parentHash),
      blockHash,
      extrinsicHash
    )
    if (!found) return null
    return {
      blockNumber: found.blockNumber,
      success: found.success,
      events: found.events.map((record) => ({
        pallet: record.event?.type ?? "",
        name: record.event?.value?.type ?? "",
        value: record.event?.value?.value,
      })),
    }
  },
  proxyFetch: gandalfFetch,
}
