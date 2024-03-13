import { HexString } from "@polkadot/util/types"
import { BehaviorSubject } from "rxjs"

import { createSubscription, unsubscribe } from "../../handlers/subscriptions"
import { Port } from "../../types/base"

// chain genesisHash => is updating metadata
type MetadataUpdates = Record<HexString, boolean>

class MetadataUpdatesStore {
  private metadataUpdates = new BehaviorSubject<MetadataUpdates>({})

  get(genesisHash: HexString) {
    return this.metadataUpdates.value[genesisHash]
  }

  set(genesisHash: HexString, updating: boolean) {
    this.metadataUpdates.next({
      ...this.metadataUpdates.value,
      [genesisHash]: updating,
    })
  }

  subscribe(id: string, port: Port, genesisHash: HexString) {
    const cb = createSubscription<"pri(metadata.updates.subscribe)">(id, port)

    let value: boolean | undefined = undefined

    const subscription = this.metadataUpdates.subscribe((metadataUpdates) => {
      const isUpdating = metadataUpdates[genesisHash]
      if (isUpdating !== value) {
        value = isUpdating
        cb({ isUpdating })
      }
    })

    port.onDisconnect.addListener((): void => {
      unsubscribe(id)
      subscription?.unsubscribe()
    })
  }
}

export const metadataUpdatesStore = new MetadataUpdatesStore()
