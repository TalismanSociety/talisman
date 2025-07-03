import {
  evmErc20TokenId,
  evmNativeTokenId,
  subAssetTokenId,
  subNativeTokenId,
  TokenList,
} from "@talismn/chaindata-provider"
import { RemoteConfigStoreData } from "extension-core"

import { CoinbaseTokenNetwork } from "../coinbase/types"
import { RampAssetInfo } from "../ramp/types"

export const getTokenFromCoinbaseAsset = (asset: CoinbaseTokenNetwork, tokens: TokenList) => {
  // if positive integer, then it is an EVM chain id
  if (/^[1-9]\d*$/.test(asset.chain_id)) {
    const tokenId = asset.contract_address
      ? evmErc20TokenId(asset.chain_id, asset.contract_address as `0x${string}`)
      : evmNativeTokenId(asset.chain_id)
    return tokens[tokenId]
  }

  return tokens[subNativeTokenId(asset.name)] ?? null // should work only with polkadot and kusama
}

export const getTokenFromRampAsset = (
  asset: RampAssetInfo,
  remoteConfig: RemoteConfigStoreData,
  tokens: TokenList,
) => {
  const networkId = remoteConfig.ramps.rampNetworks[asset.chain]
  if (!networkId) return null

  switch (asset.type) {
    case "ERC20":
      return tokens[evmErc20TokenId(networkId, asset.address as `0x${string}`)]
    case "NATIVE":
      return tokens[evmNativeTokenId(networkId)] ?? tokens[subNativeTokenId(networkId)]
    case "DOT_AH":
      return tokens[subAssetTokenId(networkId, asset.address ?? "UNKNOWN")]
    default:
      return null
  }

  return null
}
