import { StorageProvider } from "../../libs/Store"

/** Mechanism state that never leaves the device, so it is written before consent. */
export type AnalyticsLifecycleData = {
  /** null: installed before analytics recorded it, and not updated since. */
  installedAt: number | null
  lastTvlSnapshotAt: number | null
  lastTvlSnapshotVersion: string | null
}

class AnalyticsLifecycleStore extends StorageProvider<AnalyticsLifecycleData> {}

export const analyticsLifecycleStore = new AnalyticsLifecycleStore("analyticsLifecycle", {
  installedAt: null,
  lastTvlSnapshotAt: null,
  lastTvlSnapshotVersion: null,
})
