import { log } from "@common/log"
import type { XcmVersionedAssets } from "@polkadot-api/descriptors"
import {
  type DotNetwork,
  subAssetTokenId,
  subNativeTokenId,
  type TokenId,
} from "@talismn/chaindata-provider"

export const getMultiAssetTokenId = (
  assets: XcmVersionedAssets,
  chain: DotNetwork
): { tokenId: TokenId; value: bigint } => {
  if (assets.type === "V3") {
    // our view only support displaying one asset
    if (assets.value.length === 1) {
      const asset = assets.value[0]

      if (asset.id.type === "Concrete" && asset.fun.type === "Fungible") {
        const value = asset.fun.value
        const { parents, interior } = asset.id.value

        if (parents === 0) {
          if (interior.type === "Here" && chain.nativeTokenId) {
            return { tokenId: chain.nativeTokenId, value }
          }
          if (interior.type === "X2") {
            if (
              interior.value[0].type === "PalletInstance" &&
              interior.value[0].value === 50 &&
              interior.value[1].type === "GeneralIndex"
            ) {
              // Assets pallet
              const assetId = interior.value[1].value
              const tokenId = subAssetTokenId(chain.id, String(assetId))

              if (!tokenId) throw new Error("Unknown multi asset")

              return { tokenId, value }
            }
          }
        }

        // one hop up from a parachain is the relay chain, whose native token is not necessarily ours
        if (parents === 1 && interior.type === "Here" && chain.topology.type === "parachain") {
          return { tokenId: subNativeTokenId(chain.topology.relayId), value }
        }
      }
    }
  }

  // throw an error so the sign popup fallbacks to default view
  log.warn("Unknown multi asset", { multiAsset: assets, chain })
  throw new Error("Unknown multi asset")
}
