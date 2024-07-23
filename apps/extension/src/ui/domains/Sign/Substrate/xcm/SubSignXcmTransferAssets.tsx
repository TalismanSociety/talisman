import { Address } from "@talismn/balances"
import { Chain, TokenId, TokenList } from "@talismn/chaindata-provider"
import { encodeAnyAddress } from "@talismn/util"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { AccountJsonAny } from "@extension/core"
import { log } from "@extension/shared"
import useChains from "@ui/hooks/useChains"
import { useTokenRatesMap } from "@ui/hooks/useTokenRatesMap"
import useTokens from "@ui/hooks/useTokens"

import { SignContainer } from "../../SignContainer"
import { usePolkadotSigningRequest } from "../../SignRequestContext"
import { SignViewBodyShimmer } from "../../Views/SignViewBodyShimmer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewXTokensTransfer } from "../../Views/transfer/SignViewCrossChainTransfer"
import { $versionedMultiAssets, VersionedMultiAssets } from "../shapes/VersionedMultiAssets"
import { $versionedMultiLocation, VersionedMultiLocation } from "../shapes/VersionedMultiLocation"

const getMultiAssetTokenId = (
  multiAsset: VersionedMultiAssets | undefined,
  chain: Chain | null | undefined,
  tokens: TokenList
): { tokenId: TokenId; value: bigint } => {
  if (multiAsset?.type === "V3") {
    // our view only support displaying one asset
    if (multiAsset.value.length === 1) {
      const asset = multiAsset.value[0]

      if (asset?.id.type === "Concrete" && asset.fun.type === "Fungible") {
        const value = asset.fun.value
        const interior = asset.id.value.interior
        if (interior.type === "Here" && chain?.nativeToken?.id) {
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
  log.warn("Unknown multi asset", { multiAsset, chain })
  throw new Error("Unknown multi asset")
}

const getTargetChain = (
  multiLocation: VersionedMultiLocation,
  chain: Chain | null | undefined,
  chains: Chain[]
): Chain => {
  if (multiLocation.type === "V3") {
    // const parents = multiLocation.asV1.parents.toNumber()
    const interior = multiLocation.value.interior
    if (interior.type === "Here" && chain)
      if (multiLocation.value.parents === 0) return chain
      else if (multiLocation.value.parents === 1) {
        const targetChain = chains.find((c) => c.id === chain.relay?.id)
        if (targetChain) return targetChain
      }
    if (interior.type === "X1" && chain && interior.value.type === "Parachain") {
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

const getTargetAccount = (
  multiLocation: VersionedMultiLocation | undefined,
  account: AccountJsonAny
): Address => {
  if (multiLocation?.type === "V3") {
    // const parents = multiLocation.asV1.parents.toNumber()
    const interior = multiLocation.value.interior
    if (interior.type === "Here" && account) return account.address
    if (interior.type === "X1") {
      if (interior.value.type === "AccountKey20") return encodeAnyAddress(interior.value.key)
      if (interior.value.type === "AccountId32") return encodeAnyAddress(interior.value.id)
    }
  }
  // throw an error so the sign popup fallbacks to default view
  log.warn("Unknown multi location", multiLocation)
  throw new Error("Unknown multi location")
}

export const SubSignXcmTransferAssets = () => {
  const { t } = useTranslation("request")
  const { chain, payload, account, extrinsic } = usePolkadotSigningRequest()
  const { tokensMap } = useTokens({ activeOnly: false, includeTestnets: true })
  const { chains } = useChains({ activeOnly: false, includeTestnets: true })
  const tokenRates = useTokenRatesMap()

  const props = useMemo(() => {
    if (Object.keys(tokensMap).length === 0) return null
    if (!chain) throw new Error("Unknown chain")
    if (!extrinsic) throw new Error("Unknown extrinsic")

    const dest = $versionedMultiLocation.decode(extrinsic.method.args[0].toU8a())
    const beneficiary = $versionedMultiLocation.decode(extrinsic.method.args[1].toU8a())
    const assets = $versionedMultiAssets.decode(extrinsic.method.args[2].toU8a())

    const { tokenId, value } = getMultiAssetTokenId(assets, chain, tokensMap)
    const token = tokensMap[tokenId]
    if (!token) throw new Error("Unknown token")

    const toNetwork = getTargetChain(dest, chain, chains)
    const toAddress = getTargetAccount(beneficiary, account)

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
  }, [chain, extrinsic, tokensMap, chains, account, tokenRates, payload.address])

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
