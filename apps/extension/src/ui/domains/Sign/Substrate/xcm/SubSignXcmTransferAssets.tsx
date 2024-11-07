import { Chain, TokenId, TokenList } from "@talismn/chaindata-provider"
import { encodeAnyAddress } from "@talismn/util"
import { isJsonPayload } from "extension-core"
import { PolkadotAssetHubCalls, PolkadotCalls, XcmVersionedAssets } from "papi-descriptors"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { log } from "@extension/shared"
import { useChains, useTokenRatesMap, useTokensMap } from "@ui/state"

import { SignContainer } from "../../SignContainer"
import { usePolkadotSigningRequest } from "../../SignRequestContext"
import { SignViewBodyShimmer } from "../../Views/SignViewBodyShimmer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewXTokensTransfer } from "../../Views/transfer/SignViewCrossChainTransfer"
import { getAddressFromXcmLocation } from "../util/getAddressFromXcmLocation"
import { getChainFromXcmLocation } from "../util/getChainFromXcmLocation"

type SupportedCall =
  | {
      pallet: "XcmPallet"
      call: "reserve_transfer_assets"
      args: PolkadotCalls["XcmPallet"]["reserve_transfer_assets"]
    }
  | {
      pallet: "XcmPallet"
      call: "limited_reserve_transfer_assets"
      args: PolkadotCalls["XcmPallet"]["limited_reserve_transfer_assets"]
    }
  | {
      pallet: "XcmPallet"
      call: "limited_teleport_assets"
      args: PolkadotCalls["XcmPallet"]["limited_teleport_assets"]
    }
  | {
      pallet: "PolkadotXcm"
      call: "reserve_transfer_assets"
      args: PolkadotAssetHubCalls["PolkadotXcm"]["reserve_transfer_assets"]
    }
  | {
      pallet: "PolkadotXcm"
      call: "limited_reserve_transfer_assets"
      args: PolkadotAssetHubCalls["PolkadotXcm"]["limited_reserve_transfer_assets"]
    }
  | {
      pallet: "PolkadotXcm"
      call: "limited_teleport_assets"
      args: PolkadotAssetHubCalls["PolkadotXcm"]["limited_teleport_assets"]
    }

const getMultiAssetTokenId = (
  assets: XcmVersionedAssets,
  chain: Chain,
  tokens: TokenList,
): { tokenId: TokenId; value: bigint } => {
  if (assets.type === "V3") {
    // our view only support displaying one asset
    if (assets.value.length === 1) {
      const asset = assets.value[0]

      if (asset.id.type === "Concrete" && asset.fun.type === "Fungible") {
        const value = asset.fun.value
        const interior = asset.id.value.interior
        if (interior.type === "Here" && chain.nativeToken?.id) {
          return { tokenId: chain.nativeToken.id, value }
        }
        if (interior.type === "X2") {
          if (
            interior.value[0].type === "PalletInstance" &&
            interior.value[0].value === 50 &&
            interior.value[1].type === "GeneralIndex"
          ) {
            // Assets pallet
            const assetId = interior.value[1].value
            // at this stage we don't know the symbol but we know the start of the id
            const search = `${chain?.id}-substrate-assets-${assetId}`
            const tokenId = Object.keys(tokens).find((id) => id.startsWith(search))

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

export const SubSignXcmTransferAssets = () => {
  const { t } = useTranslation("request")
  const { chain, payload, account, sapi } = usePolkadotSigningRequest()
  const tokensMap = useTokensMap()
  const chains = useChains()
  const tokenRates = useTokenRatesMap()

  const props = useMemo(() => {
    if (!sapi) throw new Error("missing sapi")
    if (!isJsonPayload(payload)) throw new Error("missing payload")
    if (!chain) throw new Error("missing chain")

    const { pallet, call, args } = sapi.getDecodedCallFromPayload<SupportedCall>(payload)
    log.debug("Decoded call", { pallet, call, args })

    const { tokenId, value } = getMultiAssetTokenId(args.assets, chain, tokensMap)
    const token = tokensMap[tokenId]
    if (!token) throw new Error("Unknown token")

    const toNetwork = getChainFromXcmLocation(args.dest, chain, chains)
    const toAddress = getAddressFromXcmLocation(args.beneficiary, account)

    return {
      value,
      tokenDecimals: token.decimals,
      tokenSymbol: token.symbol,
      tokenLogo: token.logo,
      tokenRates: tokenRates[tokenId],
      fromNetwork: chain.id,
      toNetwork: toNetwork.id,
      fromAddress: encodeAnyAddress(payload.address, chain.prefix ?? undefined),
      toAddress: encodeAnyAddress(toAddress, toNetwork.prefix ?? undefined),
    }
  }, [account, chain, chains, payload, sapi, tokenRates, tokensMap])

  if (!props) return <SignViewBodyShimmer />

  return (
    <SignContainer
      networkType="substrate"
      title={t("Transfer")}
      header={<SignViewIconHeader icon="transfer" />}
    >
      <SignViewXTokensTransfer {...props} />
    </SignContainer>
  )
}
