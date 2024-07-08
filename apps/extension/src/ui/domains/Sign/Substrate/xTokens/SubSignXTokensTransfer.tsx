import { log } from "@extension/shared"
import { Codec } from "@polkadot/types-codec/types"
import { assert } from "@polkadot/util"
import { Address } from "@talismn/balances"
import { Chain, Token } from "@talismn/chaindata-provider"
import * as $ from "@talismn/subshape-fork"
import { encodeAnyAddress } from "@talismn/util"
import useChains from "@ui/hooks/useChains"
import { useTokenRatesMap } from "@ui/hooks/useTokenRatesMap"
import useTokens from "@ui/hooks/useTokens"
import isEqual from "lodash/isEqual"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignContainer } from "../../SignContainer"
import { usePolkadotSigningRequest } from "../../SignRequestContext"
import { SignViewBodyShimmer } from "../../Views/SignViewBodyShimmer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewXTokensTransfer } from "../../Views/transfer/SignViewCrossChainTransfer"
import { $versionedMultiLocation, VersionedMultiLocation } from "../shapes/VersionedMultiLocation"
import { XcmV3Junction } from "../shapes/XcmV3Junction"

const normalizeTokenId = (tokenId: unknown) => {
  if (typeof tokenId === "string" && tokenId.startsWith("{") && tokenId.endsWith("}"))
    tokenId = JSON.parse(tokenId)
  if (typeof tokenId === "object") {
    // some property names don't have the same case in chaindata. ex: vsKSM
    return Object.entries(tokenId as Record<string, unknown>).reduce((acc, [key, value]) => {
      acc[key.toLowerCase()] = typeof value === "string" ? value.toLowerCase() : value
      return acc
    }, {} as Record<string, unknown>)
  }
  return tokenId
}

const isSameTokenId = (tokenId1: unknown, tokenId2: unknown) => {
  tokenId1 = normalizeTokenId(tokenId1)
  tokenId2 = normalizeTokenId(tokenId2)
  return isEqual(tokenId1, tokenId2)
}

const getTokenFromCurrency = (currency: Codec, chain: Chain, tokens: Token[]): Token => {
  // ex: HDX
  if (currency.toRawType() === "u32") {
    const currencyId = currency.toPrimitive() as number
    if (currencyId === 0) return tokens.find((t) => t.id === chain.nativeToken?.id) as Token
    const token = tokens.find((t) => t.type === "substrate-tokens" && t.onChainId === currencyId)
    if (token) return token
    log.warn("unknown currencyId %d on chain %s", currencyId, chain.id)
  }

  const jsonCurrency = currency.toJSON()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unsafeCurrency = currency as any
  const lsymbol = (unsafeCurrency.isToken ? unsafeCurrency.asToken.type : "").toLowerCase()

  const token = tokens.find(
    (t) =>
      // ex: ACA
      (t.type === "substrate-native" && t.symbol.toLowerCase() === lsymbol) ||
      (t.type === "substrate-tokens" &&
        // ex: vsKSM
        (isSameTokenId(t.onChainId, jsonCurrency) ||
          // ex: aUSD
          t.onChainId?.toString()?.toLowerCase() === jsonCurrency?.toString().toLowerCase()))
  )
  if (token) return token

  // throw an error so the sign popup fallbacks to default view
  log.warn("unknown on chain %s", chain.id, currency.toHuman())
  throw new Error("Token not found")
}

const getTargetFromInterior = (
  interior: XcmV3Junction,
  chain: Chain,
  chains: Chain[]
): { chain?: Chain; address?: Address } => {
  if (interior.type === "Parachain") {
    const paraId = interior.value
    const relayId = chain.relay ? chain.relay.id : chain.id
    const targetChain = chains.find((c) => c.relay?.id === relayId && c.paraId === paraId)
    if (targetChain) return { chain: targetChain }
  }
  if (interior.type === "AccountKey20") return { address: encodeAnyAddress(interior.key) }
  if (interior.type === "AccountId32") return { address: encodeAnyAddress(interior.id) }

  // throw an error so the sign popup fallbacks to default view
  //log.warn("Unsupported interior", interior.toHuman())
  throw new Error("Unknown interior")
}

const getTarget = (
  multiLocation: VersionedMultiLocation | undefined,
  chain: Chain,
  chains: Chain[],
  address: Address
): { chain?: Chain; address?: Address } => {
  if (multiLocation?.type === "V3") {
    // const parents = multiLocation.asV1.parents.toNumber()
    const interior = multiLocation.value.interior
    if (interior.type === "Here" && chain) return { chain, address }

    if (interior.type === "X1") {
      if (interior.value.type === "Parachain") {
        const paraId = interior.value.value
        const relayId = chain.relay ? chain.relay.id : chain.id
        const targetChain = chains.find((c) => c.relay?.id === relayId && c.paraId === paraId)
        if (targetChain) return { chain: targetChain, address }
      }

      const targetChain =
        multiLocation.value.parents === 1 ? chains.find((c) => c.id === chain.relay?.id) : chain
      if (interior.value.type === "AccountKey20")
        return { chain: targetChain, address: encodeAnyAddress(interior.value.key) }
      if (interior.value.type === "AccountId32")
        return { chain: targetChain, address: encodeAnyAddress(interior.value.id) }
    }

    if (interior.type === "X2") {
      const interiorX2 = interior.value
      const res0 = getTargetFromInterior(interiorX2[0], chain, chains)
      const res1 = getTargetFromInterior(interiorX2[1], chain, chains)
      const resChain = res0.chain || res1.chain
      const resAddress = res0.address || res1.address
      if (!resChain || !resAddress) throw new Error("Unknown multi location")
      return {
        chain: resChain,
        address: resAddress,
      }
    }
  }

  // throw an error so the sign popup fallbacks to default view
  //log.warn("Unsupported multi location", multiLocation?.toHuman())
  throw new Error("Unknown multi location")
}

export const SubSignXTokensTransfer = () => {
  const { t } = useTranslation("request")
  const { chain, payload, account, extrinsic } = usePolkadotSigningRequest()
  const { tokens } = useTokens({ activeOnly: false, includeTestnets: true })
  const { chains } = useChains({ activeOnly: false, includeTestnets: true })
  const tokenRates = useTokenRatesMap()

  const props = useMemo(() => {
    // wait for tokens to be loaded
    if (!tokens.length) return null
    assert(extrinsic, "No extrinsic")
    assert(chain, "No chain")

    // CurrencyId - currency ids are chain specific, can't use subshape easily
    const currency = extrinsic.method.args[0] // as any
    const value = $.u128.decode(extrinsic.method.args[1].toU8a())
    const dest = $versionedMultiLocation.decode(extrinsic.method.args[2].toU8a())

    const token = getTokenFromCurrency(
      currency,
      chain,
      tokens.filter((c) => c.chain?.id === chain.id)
    )

    const target = getTarget(dest, chain, chains, account.address)
    assert(target.chain && target.address, "Unknown target")
    return {
      value,
      tokenDecimals: token.decimals,
      tokenSymbol: token.symbol,
      tokenLogo: token.logo,
      tokenRates: tokenRates[token.id],
      fromNetwork: chain.id,
      toNetwork: target.chain.id,
      fromAddress: encodeAnyAddress(payload.address, chain.prefix ?? undefined),
      toAddress: encodeAnyAddress(target.address, target.chain.prefix ?? undefined),
    }
  }, [extrinsic, chain, tokens, chains, account.address, tokenRates, payload.address])

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
