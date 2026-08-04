import { log } from "@common/log"
import { createClient, type SubstrateClient } from "@polkadot-api/substrate-client"
import { getWsProvider } from "@polkadot-api/ws-provider"
import { SubDTaoBalanceModule } from "@talismn/balances"
import type { IChainConnectorDot } from "@talismn/chain-connectors"
import {
  type DotNetwork,
  DotNetworkSchema,
  type SubNativeToken,
  SubNativeTokenSchema,
  subNativeTokenId,
} from "@talismn/chaindata-provider"
import { fetchBestMetadata } from "@talismn/sapi"
import { decAnyMetadata, getDynamicBuilder, getLookupFn, unifyMetadata } from "@talismn/scale"

import { activeNetworksStore } from "../balances/store.activeNetworks"
import { customChaindataStore } from "../chaindata/store.customChaindata"
import { BITTENSOR_DEVNET_RPC, BITTENSOR_DEVNET_NETWORK_ID as NETWORK_ID } from "./constants"

type RpcSend = <T>(method: string, params?: unknown[]) => Promise<T>

/**
 * Registers a local subtensor node as a custom bittensor network, so the dtao features can be
 * exercised against a chain we control (root stake unlock interval, enabled claims, set weights…).
 *
 * Subnet (alpha) tokens are normally published in the remote chaindata, which only knows about
 * mainnet and testnet, so they are discovered here with the same balance module code that the
 * chaindata build runs.
 */
export const initialiseBittensorDevnet = async () => {
  if (!BITTENSOR_DEVNET_RPC) return

  const client = createClient(getWsProvider(BITTENSOR_DEVNET_RPC, { timeout: 5_000 }))

  try {
    const send: RpcSend = (method, params) => client.request(method, params ?? [])

    const { network, nativeToken, metadataRpc } = await getDevnetChaindata(send)

    await customChaindataStore.upsertNetwork(network, nativeToken)
    await activeNetworksStore.setActive(NETWORK_ID, true)

    const tokens = await getDevnetSubnetTokens(
      client,
      network.specVersion,
      metadataRpc,
      nativeToken
    )
    await customChaindataStore.upsert([], tokens)

    log.log("[bittensor-devnet] registered %s with %d subnet tokens", NETWORK_ID, tokens.length)
  } catch (err) {
    log.error("[bittensor-devnet] failed to register %s", BITTENSOR_DEVNET_RPC, err)
  } finally {
    client.destroy()
  }
}

const getDevnetChaindata = async (send: RpcSend) => {
  const [genesisHash, properties, chainName, runtimeVersion] = await Promise.all([
    send<`0x${string}`>("chain_getBlockHash", [0]),
    send<{ tokenSymbol?: string; tokenDecimals?: number; ss58Format?: number }>(
      "system_properties"
    ),
    send<string>("system_chain"),
    send<{ specName: string; specVersion: number }>("state_getRuntimeVersion"),
  ])

  const symbol = properties?.tokenSymbol ?? "TAO"
  const decimals = properties?.tokenDecimals ?? 9

  const metadataRpc = await fetchBestMetadata(send, false)
  const metadata = unifyMetadata(decAnyMetadata(metadataRpc))

  const builder = getDynamicBuilder(getLookupFn(metadata))
  const encodedExistentialDeposit = metadata.pallets
    .find((pallet) => pallet.name === "Balances")
    ?.constants.find((constant) => constant.name === "ExistentialDeposit")?.value
  const existentialDeposit = encodedExistentialDeposit
    ? String(builder.buildConstant("Balances", "ExistentialDeposit").dec(encodedExistentialDeposit))
    : "0"

  const nativeToken: SubNativeToken = SubNativeTokenSchema.parse({
    id: subNativeTokenId(NETWORK_ID),
    type: "substrate-native",
    platform: "polkadot",
    networkId: NETWORK_ID,
    symbol,
    name: symbol,
    decimals,
    isDefault: true,
    existentialDeposit,
  })

  const network: DotNetwork = DotNetworkSchema.parse({
    id: NETWORK_ID,
    platform: "polkadot",
    name: "Bittensor Devnet",
    isTestnet: true,
    rpcs: [BITTENSOR_DEVNET_RPC],
    nativeCurrency: { symbol, name: symbol, decimals },
    nativeTokenId: nativeToken.id,
    genesisHash,
    chainName,
    specName: runtimeVersion.specName,
    specVersion: runtimeVersion.specVersion,
    account: "*25519",
    prefix: properties?.ss58Format ?? 42,
    hasCheckMetadataHash: !!metadata.extrinsic.signedExtensions[0]?.some(
      ({ identifier }) => identifier === "CheckMetadataHash"
    ),
    topology: { type: "standalone" },
  })

  return { network, nativeToken, metadataRpc }
}

const getDevnetSubnetTokens = async (
  client: SubstrateClient,
  specVersion: number,
  metadataRpc: `0x${string}`,
  nativeToken: SubNativeToken
) => {
  const miniMetadata = SubDTaoBalanceModule.getMiniMetadata({
    networkId: NETWORK_ID,
    specVersion,
    metadataRpc,
  })
  if (!miniMetadata.data) throw new Error("Node does not expose the SubtensorModule pallet")

  const tokens = await SubDTaoBalanceModule.fetchTokens({
    networkId: NETWORK_ID,
    tokens: [],
    connector: getOneShotConnector(client),
    miniMetadata,
    cache: {},
  })

  // group root with the native token in the portfolio, as the chaindata build does for mainnet
  return tokens.map((token) =>
    token.netuid === 0 ? { ...token, symbol: nativeToken.symbol } : token
  )
}

/** the network isn't in chaindata yet when tokens are fetched, so the module talks to our own client */
const getOneShotConnector = (client: SubstrateClient): IChainConnectorDot => ({
  send: <T>(_chainId: string, method: string, params: unknown[]) =>
    client.request<T>(method, params),
  subscribe: () => Promise.reject(new Error("Not supported")),
  reset: () => Promise.resolve(),
})
