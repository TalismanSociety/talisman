import type { NetworkId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import type { BaseQuote, NonEmpty, QuoteLeg, SwapEnv } from "./common.swap-module"

/** Charged by Talisman out of the input amount, shown as its own row on the confirm screen */
export const TALISMAN_FEE_NAME = "Talisman Fee"

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
