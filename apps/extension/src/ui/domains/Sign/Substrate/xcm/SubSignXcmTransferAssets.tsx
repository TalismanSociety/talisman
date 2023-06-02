import { AccountJsonAny } from "@core/domains/accounts/types"
import { log } from "@core/log"
import {
  FungibilityV1,
  VersionedMultiAssets,
  VersionedMultiLocation,
} from "@polkadot/types/interfaces/xcm"
import { Address } from "@talismn/balances"
import { Chain, TokenId } from "@talismn/chaindata-provider"
import { encodeAnyAddress } from "@talismn/util"
import useChains from "@ui/hooks/useChains"
import { useExtrinsic } from "@ui/hooks/useExtrinsic"
import { useTokenRatesMap } from "@ui/hooks/useTokenRatesMap"
import useTokens from "@ui/hooks/useTokens"
import { useMemo } from "react"

import { SignContainer } from "../../SignContainer"
import { usePolkadotSigningRequest } from "../../SignRequestContext"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewXTokensTransfer } from "../../Views/transfer/SignViewCrossChainTransfer"

const getMultiAssetTokenId = (
  multiAsset: VersionedMultiAssets | undefined,
  chain: Chain | null | undefined
): { tokenId: TokenId; value: bigint } => {
  if (multiAsset?.isV1) {
    // our view only support displaying one asset
    if (multiAsset.asV1.length === 1) {
      const asset = multiAsset.asV1[0]
      const fungible = asset.getAtIndex(1) as FungibilityV1 // property fungibility isn't mapped properly on pjs typings

      if (asset?.id.isConcrete && fungible.isFungible) {
        if (asset.id.asConcrete.interior.isHere && chain?.nativeToken?.id) {
          return { tokenId: chain.nativeToken.id, value: fungible.asFungible.toBigInt() }
        }
      }
    }
  }

  // throw an error so the sign popup fallbacks to default view
  throw new Error("Unknown multi asset")
}

const getTargetChainId = (
  multiLocation: VersionedMultiLocation | undefined,
  chain: Chain | null | undefined,
  chains: Chain[]
): Chain => {
  if (multiLocation?.isV1) {
    // const parents = multiLocation.asV1.parents.toNumber()
    const interior = multiLocation.asV1.interior
    if (interior.isHere && chain) return chain
    if (interior.isX1 && chain && interior.asX1.isParachain) {
      const paraId = interior.asX1.asParachain.toNumber()
      const relayId = chain.relay ? chain.relay.id : chain.id
      const targetChain = chains.find((c) => c.relay?.id === relayId && c.paraId === paraId)
      if (targetChain) return targetChain
    }
  }

  // throw an error so the sign popup fallbacks to default view
  log.warn("Unknown multi location", multiLocation?.toHuman())
  throw new Error("Unknown multi location")
}

const getTargetAccount = (
  multiLocation: VersionedMultiLocation | undefined,
  account: AccountJsonAny
): Address => {
  if (multiLocation?.isV1) {
    // const parents = multiLocation.asV1.parents.toNumber()
    const interior = multiLocation.asV1.interior
    if (interior.isHere && account) return account.address
    if (interior.isX1) {
      if (interior.asX1.isAccountKey20) return interior.asX1.asAccountKey20.key.toString()
      if (interior.asX1.isAccountId32) return interior.asX1.asAccountId32.id.toString()
    }
  }
  // throw an error so the sign popup fallbacks to default view
  log.warn("Unknown multi location", multiLocation?.toHuman())
  throw new Error("Unknown multi location")
}

export const SubSignXcmTransferAssets = () => {
  const { chain, payload, account } = usePolkadotSigningRequest()
  const { data: extrinsic } = useExtrinsic(payload)
  const { tokensMap } = useTokens(true)
  const tokenRates = useTokenRatesMap()
  const { chains } = useChains(true)

  const props = useMemo(() => {
    if (!chain) throw new Error("Unknown chain")
    if (!extrinsic) throw new Error("Unknown extrinsic")

    // Note: breaks here fore statemine assets. hoping that next version of @polkadot/api will fix it
    const dest = extrinsic.registry.createType("VersionedMultiLocation", extrinsic.method.args[0])
    const beneficiary = extrinsic.registry.createType(
      "VersionedMultiLocation",
      extrinsic.method.args[1]
    )
    const assets = extrinsic.registry.createType("VersionedMultiAssets", extrinsic.method.args[2])

    const { tokenId, value } = getMultiAssetTokenId(assets, chain)
    const token = tokensMap[tokenId]
    if (!token) throw new Error("Unknown token")

    const toNetwork = getTargetChainId(dest, chain, chains)
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

  return (
    <SignContainer
      networkType="substrate"
      title="Transfer"
      header={<SignViewIconHeader icon="transfer" />}
    >
      <SignViewXTokensTransfer {...props} />
    </SignContainer>
  )
}
