import { ChainId, ExtrinsicStatus, SubscriptionCallback } from "@core/types"
import { getTypeRegistry } from "@core/util/getTypeRegistry"
import { UnsignedTransaction } from "@substrate/txwrapper-polkadot"

import RpcFactory from "../RpcFactory"

type PendingTransferInfo = {
  chainId: ChainId
  unsigned: UnsignedTransaction
  id: string
}

// simple map to store entries in memory
// very few and tiny objects in it, so there is no need to clean it up
const store = new Map<string, PendingTransferInfo>()

class PendingTransfer {
  data: PendingTransferInfo
  isTransferring = false

  constructor(data: PendingTransferInfo) {
    this.data = data
  }

  async transfer(
    signature: `0x${string}` | Uint8Array,
    callback: SubscriptionCallback<{
      nonce: string
      hash: string
      status: ExtrinsicStatus
    }>
  ) {
    if (this.isTransferring) return

    this.isTransferring = true
    const { chainId, unsigned, id } = this.data

    // create the unsigned extrinsic
    const registry = await getTypeRegistry(chainId)
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
          unsubscribe()
          return
        }

        const status = registry.createType<ExtrinsicStatus>("ExtrinsicStatus", result)
        callback(null, { nonce: tx.nonce.toString(), hash: tx.hash.toString(), status })

        if (status.isFinalized) {
          // prevent this to be called twice
          store.delete(id)
          this.isTransferring = false
          unsubscribe()
        }
      }
    )
  }
}

const add = (details: Omit<PendingTransferInfo, "id">) => {
  const id = `${details.chainId}-${details.unsigned.address}-${Date.now()}`
  store.set(id, { ...details, id })
  return id
}

const get = (id: string) => {
  const obj = store.get(id)
  if (obj) return new PendingTransfer(obj)
  return
}

// const transfer =

export const pendingTransfers = {
  add,
  get,
}
