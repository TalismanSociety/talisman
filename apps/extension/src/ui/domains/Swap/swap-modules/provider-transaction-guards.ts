import { planckToTokens } from "@talismn/util"
import BigNumber from "bignumber.js"

/**
 * Swap providers return the amount to send in their own response, but the confirmation
 * screen only ever shows the amount the user entered. Any larger amount would leave the
 * account without having been displayed, so it is rejected rather than sent.
 *
 * Non-finite and negative amounts are rejected too — a comparison against them is always
 * false, which would let a malformed response through.
 */
export const assertDepositAmountWithinInput = (params: {
  depositAmount: BigNumber.Value
  fromAmount: bigint
  decimals: number
}) => {
  const { depositAmount, fromAmount, decimals } = params

  const amount = BigNumber(depositAmount)
  const maxAmount = BigNumber(planckToTokens(fromAmount.toString(), decimals) ?? "0")

  if (!amount.isFinite() || amount.isNegative() || amount.isGreaterThan(maxAmount))
    throw new Error("Quote changed. Please try again.")
}

/**
 * A swap of an ERC20 token spends no native token, and a swap of the native token cannot
 * spend more than the amount the user entered. The provider supplies `value` alongside the
 * calldata, so without this bound a swap of a worthless token could carry away the account's
 * native balance.
 *
 * `additionalNativeValue` is the only allowed excess: the provider fees charged on top of the
 * input. The provider supplies them too, so they are only safe because the caller reads them
 * from the same quote that builds the transaction and the confirm screen shows them as
 * "Additional Fee" before the user can sign.
 */
export const assertNativeValueWithinInput = (params: {
  value: bigint
  fromAmount: bigint
  isNativeInput: boolean
  additionalNativeValue?: bigint
}) => {
  const { value, fromAmount, isNativeInput, additionalNativeValue = 0n } = params

  if (value < 0n || additionalNativeValue < 0n)
    throw new Error("Unexpected transaction amount from provider. Please try again.")

  if (isNativeInput ? value > fromAmount + additionalNativeValue : value !== additionalNativeValue)
    throw new Error("Unexpected transaction amount from provider. Please try again.")
}
