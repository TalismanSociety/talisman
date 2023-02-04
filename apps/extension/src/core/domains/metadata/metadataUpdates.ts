import { createSubscription, unsubscribe } from "@core/handlers/subscriptions"
import { Port } from "@core/types/base"
import { BehaviorSubject } from "rxjs"

// chain genesisHash => is updating metadata
type MetadataUpdates = Record<string, boolean>

class MetadataUpdatesStore {
  private metadataUpdates = new BehaviorSubject<MetadataUpdates>({})

  get(genesisHash: string) {
    return this.metadataUpdates.value[genesisHash]
  }

  set(genesisHash: string, updating: boolean) {
    this.metadataUpdates.next({
      ...this.metadataUpdates.value,
      [genesisHash]: updating,
    })
  }

  subscribe(id: string, port: Port, genesisHash: string) {
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
