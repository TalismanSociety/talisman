import type { TransactionDto } from "@core/domains/earn/exports"

export type UseYieldxyzTransactionProps = {
  address: string
  networkId: string
  transaction: TransactionDto
  /**
   * Upper bound for the native amount the provider's transaction may spend. Only an "enter" with
   * a native input token moves native tokens, and never more than the amount the user entered.
   */
  maxNativeValue: bigint
  lockTransaction?: boolean
}
