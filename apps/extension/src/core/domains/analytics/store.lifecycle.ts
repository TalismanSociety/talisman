import { StorageProvider } from "../../libs/Store"

export type AnalyticsLifecycleData = {
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
