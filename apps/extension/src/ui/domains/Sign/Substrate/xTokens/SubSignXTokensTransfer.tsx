import { log } from "@core/log"
import { Codec } from "@polkadot/types-codec/types"
import { JunctionV1, VersionedMultiLocation } from "@polkadot/types/interfaces/xcm"
import { assert } from "@polkadot/util"
import { Address } from "@talismn/balances"
import { Chain, Token } from "@talismn/chaindata-provider"
import { encodeAnyAddress } from "@talismn/util"
import useChains from "@ui/hooks/useChains"
import { useExtrinsic } from "@ui/hooks/useExtrinsic"
import { useTokenRatesMap } from "@ui/hooks/useTokenRatesMap"
import useTokens from "@ui/hooks/useTokens"
import { useMemo } from "react"

import { SignContainer } from "../../SignContainer"
import { usePolkadotSigningRequest } from "../../SignRequestContext"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewXTokensTransfer } from "../../Views/xTokens/SignViewXTokensTransfer"

const getTokenFromCurrency = (currency: Codec, chain: Chain, tokens: Token[]): Token => {
  // ex: HDX
  if (currency.toRawType() === "u32") {
    const currencyId = currency.toPrimitive() as number
    if (currencyId === 0) return tokens.find((t) => t.id === chain.nativeToken?.id) as Token
    const token = tokens.find((t) => t.type === "substrate-tokens" && t.onChainId === currencyId)
    if (token) return token
    log.warn("unknown currencyId %d on chain %s", currencyId, chain.id)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unsafeCurrency = currency as any
  if (unsafeCurrency.isToken) {
    const token = tokens.find(
      (t) =>
        // ex: ACA
        (t.type === "substrate-native" &&
          t.symbol.toLowerCase() === unsafeCurrency.asToken.type.toLowerCase()) ||
        // ex: aUSD
        (t.type === "substrate-tokens" &&
          t.onChainId?.toString()?.toLowerCase() === unsafeCurrency.toString().toLowerCase())
    )
    if (token) return token
  }

  // throw an error so the sign popup fallbacks to default view
  log.warn("unknown on chain %s", chain.id, currency.toHuman())
  throw new Error("Token not found")
}

const getTargetFromInteriorV1 = (
  interior: JunctionV1,
  chain: Chain,
  chains: Chain[]
): { chain?: Chain; address?: Address } => {
  if (interior.isParachain) {
    const paraId = interior.asParachain.toNumber()
    const relayId = chain.relay ? chain.relay.id : chain.id
    const targetChain = chains.find((c) => c.relay?.id === relayId && c.paraId === paraId)
    if (targetChain) return { chain: targetChain }
  }
  if (interior.isAccountKey20) return { address: interior.asAccountKey20.key.toString() }
  if (interior.isAccountId32) return { address: interior.asAccountId32.id.toString() }

  // throw an error so the sign popup fallbacks to default view
  log.warn("Unsupported interior", interior.toHuman())
  throw new Error("Unknown interior")
}

const getTarget = (
  multiLocation: VersionedMultiLocation | undefined,
  chain: Chain,
  chains: Chain[],
  address: Address
): { chain?: Chain; address?: Address } => {
  if (multiLocation?.isV1) {
    // const parents = multiLocation.asV1.parents.toNumber()
    const interior = multiLocation.asV1.interior
    if (interior.isHere && chain) return { chain, address }

    if (interior.isX1 && chain && interior.asX1.isParachain) {
      const paraId = interior.asX1.asParachain.toNumber()
      const relayId = chain.relay ? chain.relay.id : chain.id
      const targetChain = chains.find((c) => c.relay?.id === relayId && c.paraId === paraId)
      if (targetChain) return { chain: targetChain, address }
    }
    if (interior.isX1 && chain && interior.asX1.isAccountKey20)
      return { chain, address: interior.asX1.asAccountKey20.key.toString() }

    if (interior.isX2) {
      const interiorX2 = interior.asX2
      const res0 = getTargetFromInteriorV1(interiorX2[0], chain, chains)
      const res1 = getTargetFromInteriorV1(interiorX2[1], chain, chains)
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
  log.warn("Unsupported multi location", multiLocation?.toHuman())
  throw new Error("Unknown multi location")
}

export const SubSignXTokensTransfer = () => {
  const { chain, payload, account } = usePolkadotSigningRequest()
  const { data: extrinsic } = useExtrinsic(payload)
  const { tokens } = useTokens(true)
  const tokenRates = useTokenRatesMap()
  const { chains } = useChains(true)

  const props = useMemo(() => {
    assert(extrinsic, "No extrinsic")
    assert(chain, "No chain")

    const currency = extrinsic.method?.args[0] // as any
    const value = extrinsic.registry.createType("u128", extrinsic.method?.args[1]).toBigInt()
    const dest = extrinsic.registry.createType("VersionedMultiLocation", extrinsic.method?.args[2])

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
