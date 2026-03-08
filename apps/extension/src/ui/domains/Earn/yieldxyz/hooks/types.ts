import type { TransactionDto } from "@core/domains/earn/exports"

export type UseYieldxyzTransactionProps = {
  address: string
  networkId: string
  transaction: TransactionDto
  lockTransaction?: boolean
}
