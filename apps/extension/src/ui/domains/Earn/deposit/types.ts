import { TransactionDto } from "extension-core"

export type UseYieldxyzTransactionProps = {
  address: string
  networkId: string
  transactionDef: TransactionDto
  lockTransaction?: boolean
}
