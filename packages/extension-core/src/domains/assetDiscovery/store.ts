import { Address } from "@talismn/balances"
import { ChainId, EvmNetworkId, TokenId } from "@talismn/chaindata-provider"

import { StorageProvider } from "../../libs/Store"
import { AssetDiscoveryMode } from "./types"

export type AssetDiscoveryScanType = "manual" // | "automatic"

export type AssetDiscoveryScanState = {
  currentScanId: string | null // a non-null value means that a scan is currently running
  currentScanMode: AssetDiscoveryMode
  currentScanProgressPercent: number
  currentScanAccounts: string[]
  currentScanTokensCount: number
  /**
   * To avoid creating empty balance rows for each token/account couple to track progress, which doesn't scale, we will use cursors :
   * for each chain keep track in local storage of the latest token/account that was scanned, and process them alphabetically when scanning
   */
  currentScanCursors: Record<
    EvmNetworkId | ChainId, // account for the future when we will support other chains
    { tokenId: TokenId; address: Address; scanned: number }
  >
  lastScanTimestamp: number
  lastScanAccounts: string[]
  lastScanTokensCount: number
  lastScanMode: AssetDiscoveryMode
}

const DEFAULT_STATE: AssetDiscoveryScanState = {
  currentScanId: null,
  currentScanMode: AssetDiscoveryMode.ACTIVE_NETWORKS,
  currentScanProgressPercent: 0,
  currentScanAccounts: [],
  currentScanTokensCount: 0,
  currentScanCursors: {},
  lastScanTimestamp: 0,
  lastScanAccounts: [],
  lastScanTokensCount: 0,
  lastScanMode: AssetDiscoveryMode.ACTIVE_NETWORKS,
}

class AssetDiscoveryStore extends StorageProvider<AssetDiscoveryScanState> {
  constructor() {
    super("assetDiscovery", DEFAULT_STATE)
  }
}

export const assetDiscoveryStore = new AssetDiscoveryStore()
