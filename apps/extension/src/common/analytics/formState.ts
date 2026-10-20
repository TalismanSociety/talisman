import type { ErrorCategory } from "./errorCategory"
import { SWAP_FORM_STATES, type SwapFormState } from "./funds"

export const AMOUNT_FORM_STATES = [
  "no_amount",
  "loading",
  "insufficient_balance",
  "insufficient_fee",
  "below_minimum",
  "invalid",
  "ready",
] as const
export type AmountFormState = (typeof AMOUNT_FORM_STATES)[number]

type FormState = SwapFormState | AmountFormState

export const FORM_STATES = [...new Set([...SWAP_FORM_STATES, ...AMOUNT_FORM_STATES])] as [
  FormState,
  ...FormState[],
]

const STATE_OF_ERROR: Partial<Record<ErrorCategory, AmountFormState>> = {
  insufficient_balance: "insufficient_balance",
  insufficient_fee: "insufficient_fee",
  insufficient_gas: "insufficient_fee",
  below_minimum: "below_minimum",
}

export type AmountFormInputs = {
  amount: bigint | null | undefined
  error: ErrorCategory | null | undefined
  ready: boolean
}

export const getAmountFormState = ({ amount, error, ready }: AmountFormInputs): AmountFormState => {
  if (!amount) return "no_amount"
  if (error) return STATE_OF_ERROR[error] ?? "invalid"
  return ready ? "ready" : "loading"
}
