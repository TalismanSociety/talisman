import { evmErc20TokenId, evmNativeTokenId } from "@talismn/balances"
import { EvmNetworkId, TokenId } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { ASSET_DISCOVERY_API_URL, log } from "extension-shared"
import urlJoin from "url-join"

import { chaindataProvider } from "../../rpcs/chaindata"
import { EvmAddress } from "../ethereum/types"

type DiscoveredAssetErc20 = {
  type: "erc20"
  networkId: EvmNetworkId
  contractAddress: EvmAddress
}

type DiscoveredAssetNative = {
  type: "native"
  networkId: EvmNetworkId
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
      return evmErc20TokenId(asset.networkId, asset.contractAddress.toLowerCase())
    default:
      return null
  }
}

const getDiscoveredTokenIds = async (assets: DiscoveredAsset[]) => {
  const tokensById = await chaindataProvider.tokensById()

  // return only tokens that are already in chaindata
  return assets
    .map(getTokenIdFromAsset)
    .filter((id): id is TokenId => !!id && !!tokensById[id] && !tokensById[id].noDiscovery)
}

// For now dont create new tokens, only consider the ones defined in chain data.
// In the future we want to add missing ones automatically as custom tokens.
// The implementation below is designed for that use case, though we postponed it last minute.

// const getDiscoveredTokenIds = async (assets: DiscoveredAsset[]) => {
//   const ERC20_DETAILS_TIMEOUT = 5_000 // 5 seconds

//   const stop = log.timer("[AssetDiscovery] ensureDiscoveredAssets")

//   const [tokensById, evmNetworksById] = await Promise.all([
//     chaindataProvider.tokensById(),
//     chaindataProvider.evmNetworksById(),
//   ])

//   const assetsByNetworkId = groupBy(assets, (a) => a.networkId)

//   const foundTokenIds = new Set<string>()

//   await Promise.all(
//     Object.entries(assetsByNetworkId).map(async ([networkId, assets]) => {
//       try {
//         const network = evmNetworksById[networkId]

//         // ignore unknown networks
//         if (!network) return

//         const provider = await chainConnectorEvm.getPublicClientForEvmNetwork(networkId)
//         if (!provider) return

//         await Promise.all(
//           assets.map(async (asset) => {
//             switch (asset.type) {
//               case "native": {
//                 foundTokenIds.add(evmNativeTokenId(networkId))
//                 break
//               }
//               case "erc20": {
//                 {
//                   const id = evmErc20TokenId(networkId, asset.contractAddress.toLowerCase())
//                   if (tokensById[id]) {
//                     foundTokenIds.add(id)
//                     return
//                   }

//                   if (await assetDiscoveryStore.isInvalidErc20(networkId, asset.contractAddress))
//                     return

//                   try {
//                     const { decimals, symbol } = await Promise.race([
//                       getErc20Details(provider, asset.contractAddress),
//                       throwAfter(ERC20_DETAILS_TIMEOUT, "Timeout"),
//                     ])

//                     log.debug("[AssetDiscovery] Adding discovered asset", symbol, id)
//                     await chaindataProvider.addCustomToken({
//                       id,
//                       type: "evm-erc20",
//                       isCustom: true,
//                       contractAddress: asset.contractAddress,
//                       evmNetwork: { id: networkId },
//                       isTestnet: network.isTestnet,
//                       symbol,
//                       decimals,
//                       logo: "",
//                     })

//                     foundTokenIds.add(id)
//                   } catch (err) {
//                     log.warn("[AssetDiscovery] Failed to add discovered asset", id, { err })
//                     // if a contract isnt a erc20, in some cases the promise wont resolve
//                     // => consider that in case of Timeout, the contract is not an erc20
//                     if (
//                       err instanceof ContractFunctionExecutionError ||
//                       (err as Error)?.message === "Timeout"
//                     )
//                       await assetDiscoveryStore.setInvalidErc20(networkId, asset.contractAddress)
//                   }
//                 }
//               }
//             }
//           }),
//         )
//       } catch (err) {
//         log.error("[AssetDiscovery] Failed to ensure discovered assets for network %s", networkId, {
//           err,
//         })
//       }
//     }),
//   )

//   stop()

//   return [...foundTokenIds]
// }

// const getErc20Details = async (client: Client, address: EvmAddress) => {
//   const erc20 = getContract({ abi: erc20Abi, address, client })
//   const [symbol, decimals] = await Promise.all([erc20.read.symbol(), erc20.read.decimals()])

//   return {
//     symbol,
//     decimals,
//   }
// }
