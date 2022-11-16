import { ChainId } from "@core/domains/chains/types"
import RpcFactory from "@core/libs/RpcFactory"
import { SubscriptionCallback } from "@core/types"
import { getTypeRegistry } from "@core/util/getTypeRegistry"
import type { ExtrinsicStatus } from "@polkadot/types/interfaces"
import { UnsignedTransaction } from "@substrate/txwrapper-core"

type PendingTransferInfo = {
  chainId: ChainId
  unsigned: UnsignedTransaction
  id: string
}

// simple map to store entries in memory
// very few and tiny objects in it, so there is no need to clean it up
const store = new Map<string, PendingTransfer>()

class PendingTransfer {
  data: PendingTransferInfo
  isTransferring = false
  isTransferred = false

  constructor(data: PendingTransferInfo) {
    this.data = data
    this.transfer = this.transfer.bind(this)
  }

  async transfer(
    signature: `0x${string}` | Uint8Array,
    callback: SubscriptionCallback<{
      nonce: string
      hash: string
      status: ExtrinsicStatus
    }>
  ) {
    if (this.isTransferring || this.isTransferred) return

    this.isTransferring = true
    const { chainId, unsigned, id } = this.data

    // create the unsigned extrinsic
    const { registry } = await getTypeRegistry(chainId)
    const tx = registry.createType(
      "Extrinsic",
      { method: unsigned.method },
      { version: unsigned.version }
    )

    // apply signature
    tx.addSignature(unsigned.address, signature, unsigned)

    // execute
    const unsubscribe = await RpcFactory.subscribe(
      chainId,
      "author_submitAndWatchExtrinsic",
      "author_unwatchExtrinsic",
      "author_extrinsicUpdate",
      [tx.toHex()],
      (error, result) => {
        if (error) {
          callback(error)
          this.isTransferring = false
          unsubscribe()
          return
        }

        const status = registry.createType("ExtrinsicStatus", result)
        callback(null, { nonce: tx.nonce.toString(), hash: tx.hash.toString(), status })

        if (status.isFinalized) {
          // prevent this to be called twice
          store.delete(id)
          this.isTransferring = false
          this.isTransferred = true
          unsubscribe()
        }
      }
    )
  }
}

const add = (details: Omit<PendingTransferInfo, "id">) => {
  const id = `${details.chainId}-${details.unsigned.address}-${Date.now()}`
  store.set(id, new PendingTransfer({ ...details, id }))
  return id
}

const get = (id: string) => {
  return store.get(id)
}

export const pendingTransfers = {
  add,
  get,
}
