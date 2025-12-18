import { TransactionDto } from "extension-core"

export type UseYieldxyzTransactionProps = {
  address: string
  networkId: string
  transaction: TransactionDto
  lockTransaction?: boolean
}
