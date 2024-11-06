import { u8aToHex } from "@polkadot/util"
import { Address } from "@talismn/balances"
import { Chain, TokenId, TokenList } from "@talismn/chaindata-provider"
import { encodeAnyAddress } from "@talismn/util"
import { isJsonPayload } from "extension-core"
import {
  PolkadotAssetHubCalls,
  PolkadotCalls,
  XcmVersionedAssets,
  XcmVersionedLocation,
} from "papi-descriptors"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { AccountJsonAny } from "@extension/core"
import { log } from "@extension/shared"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useChains, useTokenRatesMap, useTokensMap } from "@ui/state"

import { SignContainer } from "../../SignContainer"
import { usePolkadotSigningRequest } from "../../SignRequestContext"
import { SignViewBodyShimmer } from "../../Views/SignViewBodyShimmer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewXTokensTransfer } from "../../Views/transfer/SignViewCrossChainTransfer"
import { SubSignBodyDefault } from "../SubSignBodyDefault"

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

const getTargetChain = (
  multiLocation: XcmVersionedLocation,
  chain: Chain,
  chains: Chain[],
): Chain => {
  if (multiLocation.type === "V3") {
    // const parents = multiLocation.asV1.parents.toNumber()
    const interior = multiLocation.value.interior
    if (interior.type === "Here")
      if (multiLocation.value.parents === 0) return chain
      else if (multiLocation.value.parents === 1) {
        const targetChain = chains.find((c) => c.id === chain.relay?.id)
        if (targetChain) return targetChain
      }
    if (interior.type === "X1" && interior.value.type === "Parachain") {
      const paraId = interior.value.value
      const relayId = chain.relay ? chain.relay.id : chain.id
      const targetChain = chains.find((c) => c.relay?.id === relayId && c.paraId === paraId)
      if (targetChain) return targetChain
    }
  }

  // throw an error so the sign popup fallbacks to default view
  log.warn("Unknown multi location", multiLocation)
  throw new Error("Unknown multi location")
}

const isPrefixMatch = (bytes: Uint8Array, prefix: Uint8Array) => {
  // Check if the Uint8Array length is at least as long as the sequence
  if (bytes.length < prefix.length) return false

  // Compare each element of the sequence with the array
  for (let i = 0; i < prefix.length; i++) if (bytes[i] !== prefix[i]) return false

  return true
}

const getTargetAccount = (
  multiLocation: XcmVersionedLocation,
  account: AccountJsonAny,
): Address => {
  if (multiLocation?.type === "V3") {
    // const parents = multiLocation.asV1.parents.toNumber()
    const interior = multiLocation.value.interior
    if (interior.type === "Here" && account) return account.address
    if (interior.type === "X1") {
      if (interior.value.type === "AccountKey20")
        return encodeAnyAddress(interior.value.value.key.asBytes())
      if (interior.value.type === "AccountId32") {
        // some chains support evm accounts (AccountId20) as AccountId32, prefixed with ETH (in ASCII) and suffixed with empty bytes to fill the remaining of the array
        // in this case we should identify the corresponding evm address
        // test case: hydration portal, xcm mythos from mythos to hydration
        const ETH_PREFIX = new Uint8Array([69, 84, 72, 0])
        if (isPrefixMatch(interior.value.value.id.asBytes(), ETH_PREFIX))
          return u8aToHex(interior.value.value.id.asBytes().slice(4, 24))

        return encodeAnyAddress(interior.value.value.id.asBytes())
      }
    }
  }
  // throw an error so the sign popup fallbacks to default view
  log.warn("Unknown multi location", multiLocation)
  throw new Error("Unknown multi location")
}

export const SubSignXcmTransferAssets = () => {
  const { t } = useTranslation("request")
  const { chain, payload, account } = usePolkadotSigningRequest()
  const tokensMap = useTokensMap()
  const chains = useChains()
  const tokenRates = useTokenRatesMap()

  const { data: sapi, error: errorSapi } = useScaleApi(chain?.id)

  const props = useMemo(() => {
    if (!sapi || !isJsonPayload(payload) || !chain) return null
    const { pallet, call, args } = sapi.getDecodedCallFromPayload<SupportedCall>(payload)
    log.debug("Decoded call", { pallet, call, args })

    const { tokenId, value } = getMultiAssetTokenId(args.assets, chain, tokensMap)
    const token = tokensMap[tokenId]
    if (!token) throw new Error("Unknown token")

    const toNetwork = getTargetChain(args.dest, chain, chains)
    const toAddress = getTargetAccount(args.beneficiary, account)

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

  if (errorSapi) return <SubSignBodyDefault />

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
