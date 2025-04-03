import { EvmNetworkId } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { throwAfter } from "@talismn/util"
import { log } from "extension-shared"
import { groupBy } from "lodash"
import urlJoin from "url-join"
import { Client, ContractFunctionExecutionError, erc20Abi, getContract } from "viem"

import { chainConnectorEvm } from "../../rpcs/chain-connector-evm"
import { chaindataProvider } from "../../rpcs/chaindata"
import { remoteConfigStore } from "../app/store.remoteConfig"
import { EvmAddress } from "../ethereum/types"
import { assetDiscoveryStore } from "./store"

const ERC20_DETAILS_TIMEOUT = 5_000 // 5 seconds

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

export const registerMissingTokens = async (addresses: string[]) => {
  const stop = log.timer("[AssetDiscovery] registerMissingTokens")

  const evmAddresses = addresses.map(isEthereumAddress)
  if (!evmAddresses.length) return []

  const discoveredAssets = await discoverTokensFromApi(addresses)
  if (!discoveredAssets.length) return []

  const newNetworkIds = await ensureDiscoveredAssets(discoveredAssets)

  stop()

  return newNetworkIds
}

const discoverTokensFromApi = async (addresses: string[]) => {
  try {
    const { apiUrl } = await remoteConfigStore.get("assetDiscovery")
    const url = urlJoin(apiUrl, "discover")

    const response = await fetch(url, { method: "POST", body: JSON.stringify({ addresses }) })
    if (!response.ok) throw new Error(`Error: ${response.status} ${response.statusText}`)

    return (await response.json()) as DiscoveredAsset[]
  } catch (err) {
    log.error("[AssetDiscovery] Unable to fetch tokens from API", { err })
    return []
  }
}

const ensureDiscoveredAssets = async (assets: DiscoveredAsset[]) => {
  const stop = log.timer("[AssetDiscovery] ensureDiscoveredAssets")

  const [tokensById, evmNetworksById] = await Promise.all([
    chaindataProvider.tokensById(),
    chaindataProvider.evmNetworksById(),
  ])

  const assetsByNetworkId = groupBy(
    assets.filter((asset) => asset.type === "erc20"),
    (a) => a.networkId,
  )

  await Promise.all(
    Object.entries(assetsByNetworkId).map(async ([networkId, assets]) => {
      try {
        const network = evmNetworksById[networkId]

        // ignore unknown networks
        if (!network) return

        const provider = await chainConnectorEvm.getPublicClientForEvmNetwork(networkId)
        if (!provider) return

        await Promise.all(
          assets.map(async (asset) => {
            const id = `${networkId}-evm-erc20-${asset.contractAddress.toLowerCase()}`
            if (
              tokensById[id] ||
              tokensById[`${networkId}-evm-uniswapv2-${asset.contractAddress.toLowerCase()}`] // could be a known LP too
            )
              return

            if (await assetDiscoveryStore.isInvalidErc20(networkId, asset.contractAddress)) return

            try {
              const { decimals, symbol } = await Promise.race([
                getErc20Details(provider, asset.contractAddress),
                throwAfter(ERC20_DETAILS_TIMEOUT, "Timeout"),
              ])

              log.debug("[AssetDiscovery] Adding discovered asset", symbol, id)
              await chaindataProvider.addCustomToken({
                id: `${networkId}-evm-erc20-${asset.contractAddress.toLocaleLowerCase()}`,
                type: "evm-erc20",
                isCustom: true,
                contractAddress: asset.contractAddress,
                evmNetwork: { id: networkId },
                isTestnet: network.isTestnet,
                symbol,
                decimals,
                logo: "", // TODO unknown token url
              })
            } catch (err) {
              log.warn("[AssetDiscovery] Failed to add discovered asset", id, { err })
              // if a contract isnt a erc20, in some cases the promise wont resolve
              // => consider that in case of Timeout, the contract is not an erc20
              if (
                err instanceof ContractFunctionExecutionError ||
                (err as Error)?.message === "Timeout"
              )
                await assetDiscoveryStore.setInvalidErc20(networkId, asset.contractAddress)
            }
          }),
        )
      } catch (err) {
        log.error("[AssetDiscovery] Failed to ensure discovered assets for network %s", networkId, {
          err,
        })
      }
    }),
  )

  stop()

  // returns the list of chain ids for which we have discovered assets
  return Object.keys(assetsByNetworkId)
}

const getErc20Details = async (client: Client, address: EvmAddress) => {
  const erc20 = getContract({ abi: erc20Abi, address, client })
  const [symbol, decimals] = await Promise.all([erc20.read.symbol(), erc20.read.decimals()])

  return {
    symbol,
    decimals,
  }
}
