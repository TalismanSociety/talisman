import { StorageProvider } from "@core/libs/Store"

export type AssetDiscoveryScanStatus = "idle" | "scanning" | "cancelled" | "completed"
export type AssetDiscoveryScanType = "manual" // | "automatic"

export type AssetDiscoveryScanState = {
  currentScanId: string | null
  currentScanFull: boolean
  currentScanType: AssetDiscoveryScanType
  lastScanTimestamp: number
  lastScanAccounts: string[]
  lastScanFull: boolean
  status: AssetDiscoveryScanStatus
}

const DEFAULT_STATE: AssetDiscoveryScanState = {
  currentScanId: null,
  currentScanFull: false,
  currentScanType: "manual",
  lastScanTimestamp: 0,
  lastScanAccounts: [],
  lastScanFull: false,
  status: "idle",
}

class AssetDiscoveryStore extends StorageProvider<AssetDiscoveryScanState> {
  constructor() {
    super("assetDiscovery", DEFAULT_STATE)
  }
}

export const assetDiscoveryStore = new AssetDiscoveryStore()
