import {
  EthNetworkId,
  evmErc20TokenId,
  evmNativeTokenId,
  TokenId,
} from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { ASSET_DISCOVERY_API_URL, log } from "extension-shared"
import urlJoin from "url-join"

import { chaindataProvider } from "../../rpcs/chaindata"
import { EvmAddress } from "../ethereum/types"

type DiscoveredAssetErc20 = {
  type: "erc20"
  networkId: EthNetworkId
  contractAddress: EvmAddress
}

type DiscoveredAssetNative = {
  type: "native"
  networkId: EthNetworkId
}

type DiscoveredAsset = DiscoveredAssetErc20 | DiscoveredAssetNative

/**
 *
 * @param addresses
 * @returns list of all token ids that were found
 */
export const fetchMissingTokens = async (addresses: string[]) => {
  const stop = log.timer("[AssetDiscovery] fetchMissingTokens")

  const evmAddresses = addresses.map(isEthereumAddress)
  if (!evmAddresses.length) return []

  const discoveredAssets = await discoverTokensFromApi(addresses)
  if (!discoveredAssets.length) return []

  // for now, consider only tokens defined in chain data
  const foundTokenIds = await getDiscoveredTokenIds(discoveredAssets)

  stop()

  return foundTokenIds
}

const discoverTokensFromApi = async (addresses: string[]) => {
  try {
    const url = urlJoin(ASSET_DISCOVERY_API_URL, "discover")

    const response = await fetch(url, { method: "POST", body: JSON.stringify({ addresses }) })
    if (!response.ok) throw new Error(`Error: ${response.status} ${response.statusText}`)

    return (await response.json()) as DiscoveredAsset[]
  } catch (err) {
    log.error("[AssetDiscovery] Unable to fetch tokens from Asset Discovery API", { err })
    return []
  }
}

const getTokenIdFromAsset = (asset: DiscoveredAsset): TokenId | null => {
  switch (asset.type) {
    case "native":
      return evmNativeTokenId(asset.networkId)
    case "erc20":
      return evmErc20TokenId(asset.networkId, asset.contractAddress)
    default:
      return null
  }
}

const getDiscoveredTokenIds = async (assets: DiscoveredAsset[]) => {
  const tokensById = await chaindataProvider.getTokensMapById()

  return assets
    .map(getTokenIdFromAsset)
    .filter((id): id is TokenId => !!id && !!tokensById[id] && !tokensById[id].noDiscovery)
}
