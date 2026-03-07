import type { TransactionDto } from "@core"

export type UseYieldxyzTransactionProps = {
  address: string
  networkId: string
  transaction: TransactionDto
  lockTransaction?: boolean
}
