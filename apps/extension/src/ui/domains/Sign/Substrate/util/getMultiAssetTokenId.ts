import { XcmVersionedAssets } from "@polkadot-api/descriptors"
import { DotNetwork, subAssetTokenId, TokenId } from "@talismn/chaindata-provider"
import { log } from "extension-shared"

export const getMultiAssetTokenId = (
  assets: XcmVersionedAssets,
  chain: DotNetwork,
): { tokenId: TokenId; value: bigint } => {
  if (assets.type === "V3") {
    // our view only support displaying one asset
    if (assets.value.length === 1) {
      const asset = assets.value[0]

      if (asset.id.type === "Concrete" && asset.fun.type === "Fungible") {
        const value = asset.fun.value
        const interior = asset.id.value.interior
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
    }
  }

  // throw an error so the sign popup fallbacks to default view
  log.warn("Unknown multi asset", { multiAsset: assets, chain })
  throw new Error("Unknown multi asset")
}
