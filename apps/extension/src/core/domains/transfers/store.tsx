import { StorageProvider } from "@core/libs/Store"
import { ChainId } from "@talismn/chaindata-provider"

// TODO delete in few months
type TransactionId = string
type TransactionStatus = "PENDING" | "SUCCESS" | "ERROR"
type Transaction = {
  id: string
  from: string
  nonce: string
  hash: string
  chainId: ChainId
  blockHash?: string
  blockNumber?: string
  extrinsicIndex?: number
  status: TransactionStatus
  message?: string
  createdAt: number
}

export type TransactionSubject = Record<TransactionId, Transaction>

export class TransactionStore extends StorageProvider<TransactionSubject> {
  constructor(prefix: string) {
    super(prefix)

    // Clear this store
    // TODO keep this for few months so it's emptied for most users, then delete the store and all associated types
    this.clear()
  }
}

const transactionStoreSingleton = new TransactionStore("transactions")

export default transactionStoreSingleton
