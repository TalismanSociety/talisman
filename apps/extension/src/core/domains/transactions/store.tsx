import { createSubscription, unsubscribe } from "@core/handlers/subscriptions"
import { StorageProvider } from "@core/libs/Store"
import {
  Address,
  ChainId,
  Port,
  RequestIdOnly,
  Transaction,
  TransactionId,
  TransactionStatus,
} from "@core/types"
import { ExtrinsicStatus } from "@polkadot/types/interfaces"
import { BehaviorSubject, combineLatest, map } from "rxjs"
import { validate as isUuid, version as uuidVersion, v4 as uuidv4 } from "uuid"

type ExtrinsicStatusType = ExtrinsicStatus["type"]
const deriveTxStatus: { [Property in ExtrinsicStatusType]: [TransactionStatus, string] } = {
  Future: ["PENDING", "Transaction pending"],
  Ready: ["PENDING", "Transaction ready for submission"],
  Broadcast: ["PENDING", "Transaction in progress"],
  InBlock: ["PENDING", "Transaction awaiting confirmation"],
  Retracted: ["PENDING", "Transaction awaiting confirmation"],
  FinalityTimeout: ["ERROR", "Transaction timed out"],
  Finalized: ["PENDING", "Transaction confirmed"],
  Usurped: ["ERROR", "Transaction superseeded"],
  Dropped: ["ERROR", "Transaction dropped"],
  Invalid: ["ERROR", "Transaction invalid"],
}

export type TransactionSubject = Record<TransactionId, Transaction>

export class TransactionStore extends StorageProvider<TransactionSubject> {
  readonly #pendingTxs = new BehaviorSubject<TransactionSubject>({})

  constructor(prefix: string) {
    super(prefix)

    // Once off migration to remove all old (pre-uuid ID) transactions
    this.get().then((txs) => {
      const deleteTxIds = Object.keys(txs).filter(
        (txId) => !isUuid(txId) || uuidVersion(txId) !== 4
      )
      this.delete(deleteTxIds)
    })
  }

  public upsert(
    from: Address,
    nonce: string,
    hash: string,
    extrinsicStatus: ExtrinsicStatus,
    chainId: ChainId,
    blockNumber?: string,
    extrinsicIndex?: number,
    extrinsicResult?: TransactionStatus
  ) {
    const existingTx = Object.values(this.#pendingTxs.value).find(
      (tx) => tx.from === from && tx.nonce === nonce
    )

    const tx: Transaction = existingTx || {
      id: uuidv4(),
      from,
      nonce,
      hash,
      chainId,
      status: "PENDING",
      createdAt: Date.now(),
    }

    // derive status and message
    ;[tx.status, tx.message] = deriveTxStatus[extrinsicStatus.type] || [tx.status, tx.message]

    // derive block hash
    tx.blockHash = extrinsicStatus.isInBlock
      ? extrinsicStatus.asInBlock.toString()
      : extrinsicStatus.isFinalized
      ? extrinsicStatus.asFinalized.toString()
      : tx.blockHash

    // get tx result (Success/Failed)
    if (
      (extrinsicStatus.isFinalized || extrinsicStatus.isInBlock) &&
      extrinsicResult !== undefined
    ) {
      tx.blockNumber = blockNumber
      tx.extrinsicIndex = extrinsicIndex
      tx.status = extrinsicResult
      tx.message = extrinsicResult === "SUCCESS" ? "Transaction successful" : "Transaction failed"
    }

    if (!extrinsicStatus.isFinalized) {
      this.#pendingTxs.next({ ...this.#pendingTxs.value, [tx.id]: tx })
    } else {
      const pendingTxs = { ...this.#pendingTxs.value }
      delete pendingTxs[tx.id]

      // add to the finalized store before removing from the pending store
      this.set({ [tx.id]: tx }).then(() => {
        this.#pendingTxs.next(pendingTxs)
      })
    }

    return { isCreated: !existingTx, id: tx.id }
  }

  public subscribe(id: string, port: Port, unsubscribeCallback?: () => void): boolean {
    const cb = createSubscription<"pri(transactions.subscribe)">(id, port)

    // TODO: Make combineLatest observable into `this.observable` so we can use subscribe from StorageProvider
    const subscription = combineLatest([
      // get finalized txs subscription
      this.observable,
      // get pending txs subscription
      this.#pendingTxs,
    ])
      // merge finalized txs into pending txs
      .pipe(map(([finalizedTxs, pendingTxs]) => ({ ...pendingTxs, ...finalizedTxs })))

      // return the combined list of all txs to the subscriber
      .subscribe((allTxs) => cb(allTxs))

    port.onDisconnect.addListener((): void => {
      unsubscribe(id)
      subscription.unsubscribe()
      if (unsubscribeCallback) unsubscribeCallback()
    })

    return true
  }

  public subscribeById(
    id: string,
    port: Port,
    request: RequestIdOnly,
    unsubscribeCallback?: () => void
  ): boolean {
    const cb = createSubscription<"pri(transactions.byid.subscribe)">(id, port)

    // TODO: Make combineLatest observable into `this.observable` so we can use subscribeById from StorageProvider
    const subscription = combineLatest([
      // get finalized txs subscription
      this.observable,
      // get pending txs subscription
      this.#pendingTxs,
    ])
      // merge finalized txs into pending txs
      .pipe(map(([finalizedTxs, pendingTxs]) => ({ ...pendingTxs, ...finalizedTxs })))

      // select the requested tx from the combined list of all txs
      .pipe(map((allTxs) => allTxs[request.id]))

      // return the selected tx to the subscriber
      .subscribe((tx) => cb(tx))

    port.onDisconnect.addListener((): void => {
      unsubscribe(id)
      subscription.unsubscribe()
      if (unsubscribeCallback) unsubscribeCallback()
    })

    return true
  }
}

const transactionStoreSingleton = new TransactionStore("transactions")

export default transactionStoreSingleton
