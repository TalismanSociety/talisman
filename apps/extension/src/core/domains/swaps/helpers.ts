import { isAddressEqual } from "@talismn/crypto"

import type { BaseQuote, NonEmpty, QuoteLeg } from "./types"

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
