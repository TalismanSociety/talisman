import { Chain, Token } from "@talismn/chaindata-provider"
import { encodeAnyAddress } from "@talismn/util"
import { isJsonPayload } from "extension-core"
import isEqual from "lodash/isEqual"
import { AcalaCalls, HydrationCalls } from "papi-descriptors"
import { Enum } from "polkadot-api"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { log } from "@extension/shared"
import { useChains, useTokenRatesMap, useTokens } from "@ui/state"

import { SignContainer } from "../../SignContainer"
import { usePolkadotSigningRequest } from "../../SignRequestContext"
import { SignViewBodyShimmer } from "../../Views/SignViewBodyShimmer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewXTokensTransfer } from "../../Views/transfer/SignViewCrossChainTransfer"
import { getAddressFromXcmLocation } from "../util/getAddressFromXcmLocation"
import { getChainFromXcmLocation } from "../util/getChainFromXcmLocation"

type SubstrateTokenId = Enum<Record<string, unknown>>
// ex:
// - "{\"type\":\"Token\",\"value\":{\"type\":\"DOT\"}}"
// - "{\"type\":\"Token2\",\"value\":4}"
// - "{\"type\":\"ForeignAsset\",\"value\":3}"

type SupportedChainCalls = AcalaCalls | HydrationCalls

type SupportedCall =
  | {
      pallet: "XTokens"
      call: "transfer"
      args: SupportedChainCalls["XTokens"]["transfer"]
    }
  | {
      pallet: "XTokens"
      call: "transfer_with_fee"
      args: SupportedChainCalls["XTokens"]["transfer_with_fee"]
    }

const normalizeTokenId = (tokenId: unknown) => {
  if (typeof tokenId === "string" && tokenId.startsWith("{") && tokenId.endsWith("}"))
    tokenId = JSON.parse(tokenId)
  if (typeof tokenId === "object") {
    // some property names don't have the same case in chaindata. ex: vsKSM
    return Object.entries(tokenId as Record<string, unknown>).reduce(
      (acc, [key, value]) => {
        // papi explicitely adds an undefined property for enum entries that have no value => ignore those
        if (value !== undefined)
          acc[key.toLowerCase()] =
            typeof value === "string" ? value.toLowerCase() : normalizeTokenId(value)
        return acc
      },
      {} as Record<string, unknown>,
    )
  }
  return tokenId
}

const isSameTokenId = (tokenId1: unknown, tokenId2: unknown) => {
  tokenId1 = normalizeTokenId(tokenId1)
  tokenId2 = normalizeTokenId(tokenId2)
  return isEqual(tokenId1, tokenId2)
}

const getTokenFromCurrency = (
  currencyId: number | SubstrateTokenId,
  chain: Chain,
  tokens: Token[],
): Token => {
  const chainTokens = tokens.filter((t) => t.chain?.id === chain.id)

  try {
    // ex: HDX
    if (typeof currencyId === "number") {
      if (currencyId === 0) return chainTokens.find((t) => t.id === chain.nativeToken?.id) as Token
      const token = chainTokens.find(
        (t) => t.type === "substrate-tokens" && String(t.onChainId) === String(currencyId),
      )
      if (token) return token
      log.warn("unknown currencyId %d on chain %s", currencyId, chain.id)

      throw new Error("Token not found")
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokenSymbol = (currencyId.value as any)?.type?.toLowerCase()

    // FAFO mastery
    const token = chainTokens.find(
      (t) =>
        (t.type === "substrate-native" &&
          (currencyId.type === "Native" || // INTR
            tokenSymbol === t.symbol.toLowerCase())) || // ACA
        (t.type === "substrate-tokens" &&
          (isSameTokenId(t.onChainId, currencyId) || // ex: vsKSM
            t.onChainId?.toString()?.toLowerCase() === currencyId?.toString().toLowerCase())), // ex: aUSD
    )
    if (token) return token

    throw new Error("Token not found")
  } catch (err) {
    log.debug("getTokenFromCurrency", { currencyId, chain, tokens, err })
    throw err
  }
}

export const SubSignXTokensTransfer = () => {
  const { t } = useTranslation("request")
  const { chain, payload, account, sapi } = usePolkadotSigningRequest()
  const tokens = useTokens()
  const chains = useChains()
  const tokenRates = useTokenRatesMap()

  const props = useMemo(() => {
    if (!sapi) throw new Error("missing sapi")
    if (!isJsonPayload(payload)) throw new Error("missing payload")
    if (!chain) throw new Error("missing chain")

    const { pallet, call, args } = sapi.getDecodedCallFromPayload<SupportedCall>(payload)
    log.debug("Decoded call", { pallet, call, args })

    const token = getTokenFromCurrency(args.currency_id, chain, tokens)
    const targetChain = getChainFromXcmLocation(args.dest, chain, chains)
    const targetAddress = getAddressFromXcmLocation(args.dest, account)

    return {
      value: args.amount,
      tokenDecimals: token.decimals,
      tokenSymbol: token.symbol,
      tokenLogo: token.logo,
      tokenRates: tokenRates[token.id],
      fromNetwork: chain.id,
      toNetwork: targetChain.id,
      fromAddress: encodeAnyAddress(payload.address, chain.prefix ?? undefined),
      toAddress: encodeAnyAddress(targetAddress, targetChain.prefix ?? undefined),
    }
  }, [account, chain, chains, payload, sapi, tokenRates, tokens])

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
