import type { BaseQuote, BuiltLeg, SwapTransactionContext } from "@core/domains/swaps/types"
import { isAddressEqual } from "@talismn/crypto"
import type { SwapModule } from "./swap-modules/common.swap-module"

export type BuildSwapTransactionParams = {
  module: SwapModule
  quote: BaseQuote
  fromTokenId: string
  toTokenId: string
  fromAddress: string
  toAddress: string
  fromAmount: bigint
  context: SwapTransactionContext
  /** decimal, 0.005 is 0.5% */
  slippage: number
  signal?: AbortSignal
}

/** the quote the first leg was built from: the plan proposes the legs of the transaction the user signs */
export type BuiltSwap = { quote: BaseQuote; leg: BuiltLeg }

export const quoteLegsKey = (quote: BaseQuote | null | undefined) =>
  quote?.legs.map((leg) => [
    leg.protocol,
    leg.fromTokenId,
    leg.toTokenId,
    leg.signer,
    leg.recipient,
    leg.inputAmount.toString(),
    leg.outputAmount.toString(),
  ]) ?? []

const isSameAddress = (address: string | null, expected: string) =>
  address === expected || (address !== null && isAddressEqual(address, expected))

const throwIfAborted = (signal: AbortSignal | undefined) => {
  if (signal?.aborted) throw new Error("Aborted")
}

/** Opens the provider exchange if the module needs one, then builds the first leg of the selected quote */
export const buildSwapTransaction = async ({
  module,
  quote,
  fromTokenId,
  toTokenId,
  fromAddress,
  toAddress,
  fromAmount,
  context,
  slippage,
  signal,
}: BuildSwapTransactionParams): Promise<BuiltSwap> => {
  const firstLeg = quote.legs[0]
  const lastLeg = quote.legs[quote.legs.length - 1]
  if (
    firstLeg.fromTokenId !== fromTokenId ||
    lastLeg.toTokenId !== toTokenId ||
    !isSameAddress(firstLeg.signer, fromAddress) ||
    !isSameAddress(lastLeg.recipient, toAddress)
  )
    throw new Error("Please select the quote again")

  const exchange =
    (await module.createExchange?.({
      fromTokenId,
      toTokenId,
      fromAmount,
      fromAddress,
      toAddress,
    })) ?? null
  throwIfAborted(signal)

  const leg = await module.buildLeg({
    leg: firstLeg,
    input: fromAmount,
    context,
    exchange,
    slippage,
  })
  throwIfAborted(signal)

  return { quote, leg }
}
