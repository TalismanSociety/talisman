import { TokenList } from "@talismn/chaindata-provider"
import { RemoteConfigStoreData } from "extension-core"

import { CoinbaseTokenNetwork } from "../coinbase/types"
import { RampAssetInfo } from "../ramp/types"

const getDotNativeTokenId = (chainId: string) => [chainId, "substrate-native"].join("-")

const getEvmNativeTokenId = (evmNetworkId: string) => [evmNetworkId, "evm-native"].join("-")

const getErc20TokenId = (evmNetworkId: string, contractAddress: string) =>
  [evmNetworkId, "evm-erc20", contractAddress.toLowerCase()].join("-")

const getDotSubstrateAssetTokenIdPrefix = (chainId: string, assetId: string) =>
  [chainId, "substrate-assets", assetId].join("-")

export const getTokenFromCoinbaseAsset = (asset: CoinbaseTokenNetwork, tokens: TokenList) => {
  // if positive integer, then it is an EVM chain id
  if (/^[1-9]\d*$/.test(asset.chain_id)) {
    const tokenId = asset.contract_address
      ? getErc20TokenId(asset.chain_id, asset.contract_address)
      : getEvmNativeTokenId(asset.chain_id)
    return tokens[tokenId]
  }

  return tokens[getDotNativeTokenId(asset.name)] ?? null // should work only with polkadot and kusama
}

export const getTokenFromRampAsset = (
  asset: RampAssetInfo,
  remoteConfig: RemoteConfigStoreData,
  tokens: TokenList,
) => {
  const networkId = remoteConfig.ramps.rampNetworks[asset.chain]
  if (!networkId) return null

  if (asset.type === "ERC20") return tokens[getErc20TokenId(networkId, asset.address ?? "")]
  if (asset.type === "NATIVE")
    return tokens[getEvmNativeTokenId(networkId)] ?? tokens[getDotNativeTokenId(networkId)]
  if (asset.type === "DOT_AH") {
    // substrate tokens have the symbol at the end of id, which might be different from coinbase's
    // => can only determine the begining of our id based on our inputs
    const tokenIdPrefix = getDotSubstrateAssetTokenIdPrefix(networkId, asset.address ?? "UNKNOWN")
    const tokenId = Object.keys(tokens).find((id) => id.startsWith(tokenIdPrefix))
    if (tokenId) return tokens[tokenId]
  }
  return null
}
