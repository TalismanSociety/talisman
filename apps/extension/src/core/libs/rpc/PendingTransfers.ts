import { ChainId, ExtrinsicStatus, SubscriptionCallback } from "@core/types"
import { getTypeRegistry } from "@core/util/getTypeRegistry"
import { UnsignedTransaction } from "@substrate/txwrapper-polkadot"
import RpcFactory from "../RpcFactory"

type PendingTransferInfo = {
  chainId: ChainId
  unsigned: UnsignedTransaction
}

// simple map to store entries in memory
// very few and tiny objects in it, so there is no need to clean it up
const store = new Map<string, PendingTransferInfo>()

const add = (details: PendingTransferInfo) => {
  const id = `${details.chainId}-${details.unsigned.address}-${Date.now()}`
  store.set(id, details)
  return id
}

const get = (id: string) => store.get(id)

const transfer = async (
  id: string,
  signature: `0x${string}` | Uint8Array,
  callback: SubscriptionCallback<{
    nonce: string
    hash: string
    status: ExtrinsicStatus
  }>
) => {
  const { chainId, unsigned } = store.get(id)!

  // prevent this to be call twice
  store.delete(id)

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

      if (status.isFinalized) unsubscribe()
    }
  )
}

export const pendingTransfers = {
  add,
  get,
  transfer,
}
