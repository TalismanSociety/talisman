import type { NetworkId, NetworkPlatform } from "@talismn/chaindata-provider"
import { isAddressEqual, isEthereumAddress, isSs58Address } from "@talismn/crypto"
import {
  type BaseQuote,
  type NonEmpty,
  platformFromTokenId,
  type QuoteLeg,
  type SwapEnv,
} from "./common.swap-module"

/** Charged by Talisman out of the input amount, shown as its own row on the confirm screen */
export const TALISMAN_FEE_NAME = "Talisman Fee"

type LaterLegAccounts = { isAddress: (address: string) => boolean; name: string }

export const LATER_LEG_ACCOUNTS: Record<NetworkPlatform, LaterLegAccounts | null> = {
  ethereum: { isAddress: isEthereumAddress, name: "an EVM" },
  polkadot: { isAddress: isSs58Address, name: "a substrate" },
  solana: null,
}

const assertLaterLegSigner = ({ signer, fromTokenId }: QuoteLeg) => {
  if (!signer) return
  const accounts = LATER_LEG_ACCOUNTS[platformFromTokenId(fromTokenId)]
  if (!accounts) throw new Error("No account signs a later leg on this network")
  if (!accounts.isAddress(signer))
    throw new Error(`Only ${accounts.name} account signs a later leg`)
}

type QuoteSummary = "legs" | "inputAmountBN" | "outputAmountBN" | "fees" | "timeInSec"

export const quoteFromLegs = (
  legs: NonEmpty<QuoteLeg>,
  presentation: Omit<BaseQuote, QuoteSummary>
): BaseQuote => {
  legs.slice(1).forEach((leg, index) => {
    const previous = legs[index]
    if (leg.fromTokenId !== previous.toTokenId) throw new Error("Quote legs do not chain")
    if (leg.signer && previous.recipient && !isAddressEqual(leg.signer, previous.recipient))
      throw new Error("Quote legs do not chain")
    assertLaterLegSigner(leg)
  })

  return {
    ...presentation,
    legs,
    inputAmountBN: legs[0].inputAmount,
    outputAmountBN: legs[legs.length - 1].outputAmount,
    fees: legs.flatMap((leg) => leg.fees),
    timeInSec: legs.reduce((total, leg) => total + leg.timeInSec, 0),
  }
}

export const getEvmNetwork = async (env: SwapEnv, networkId: NetworkId) => {
  const network = await env.getNetwork(networkId)
  if (network?.platform !== "ethereum") throw new Error("Unknown EVM network")
  return network
}

/** one in-flight or settled promise per key, a rejected one is forgotten so the next call retries */
export const memoiseByKey = <K, V>(create: (key: K) => Promise<V>) => {
  const cache = new Map<K, Promise<V>>()
  return (key: K): Promise<V> => {
    const cached = cache.get(key)
    if (cached) return cached
    const created = create(key).catch((err) => {
      cache.delete(key)
      throw err
    })
    cache.set(key, created)
    return created
  }
}
