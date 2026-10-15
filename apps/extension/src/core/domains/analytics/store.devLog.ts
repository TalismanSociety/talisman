import { StorageProvider } from "../../libs/Store"
import type { Disposition, WireEvent } from "./types"

const DEV_LOG_CAPACITY = 500

export type DevLogDisposition = Disposition | "released" | "purged"

export type DevLogEntry = {
  id: string
  name: string
  capturedAt: number
  disposition: DevLogDisposition
  wire?: WireEvent
  issues?: readonly string[]
  deliveredAt?: number
}

export interface DevLog {
  record(entries: readonly DevLogEntry[]): Promise<void>
  setDisposition(ids: readonly string[], disposition: DevLogDisposition): Promise<void>
  markDelivered(ids: readonly string[], at: number): Promise<void>
}

class DevLogStore extends StorageProvider<{ entries: DevLogEntry[] }> {}

export const devLogStore =
  process.env.BUILD === "dev" ? new DevLogStore("analyticsDevLog", { entries: [] }) : null

export const createStorageDevLog = (store: DevLogStore): DevLog => {
  const update = async (ids: readonly string[], patch: Partial<DevLogEntry>) => {
    if (!ids.length) return
    await store.mutate(({ entries }) => ({
      entries: entries.map((entry) => (ids.includes(entry.id) ? { ...entry, ...patch } : entry)),
    }))
  }
  return {
    record: async (added) => {
      await store.mutate(({ entries }) => ({
        entries: [...entries, ...added].slice(-DEV_LOG_CAPACITY),
      }))
    },
    setDisposition: (ids, disposition) => update(ids, { disposition }),
    markDelivered: (ids, deliveredAt) => update(ids, { deliveredAt }),
  }
}
