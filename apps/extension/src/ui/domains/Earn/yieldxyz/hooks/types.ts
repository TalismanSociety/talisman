import type { TransactionDto } from "@core/domains/earn/exports"

export type UseYieldxyzTransactionProps = {
  address: string
  networkId: string
  transaction: TransactionDto
  /**
   * Upper bound for the native amount this transaction may spend: the amount the user entered, less
   * what the other transactions of the same action spend. Only an "enter" with a native input token
   * moves native tokens, and never more than the amount the user entered.
   */
  maxNativeValue: bigint
  lockTransaction?: boolean
}
