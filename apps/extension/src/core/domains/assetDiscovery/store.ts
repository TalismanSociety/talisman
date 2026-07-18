import type { Address } from "@talismn/balances"
import type { NetworkId, TokenId } from "@talismn/chaindata-provider"

import { StorageProvider } from "../../libs/Store"
import type { AssetDiscoveryScanScope } from "./types"

export type AssetDiscoveryScanState = {
  currentScanScope: AssetDiscoveryScanScope | null // a non-null value means that a scan is currently running
  /**
   * To avoid creating empty balance rows for each token/account couple to track progress, which doesn't scale, we will use cursors :
   * for each chain keep track in local storage of the latest token/account that was scanned, and process them alphabetically when scanning
   */
  currentScanCursors: Record<
    NetworkId, // account for the future when we will support other chains
    { tokenId: TokenId; address: Address }
  >
  queue?: AssetDiscoveryScanScope[] // may be undefined for older installs : TODO migration ?
}

const DEFAULT_STATE: AssetDiscoveryScanState = {
  currentScanScope: null,
  currentScanCursors: {},
  queue: [],
}

class AssetDiscoveryStore extends StorageProvider<AssetDiscoveryScanState> {
  constructor() {
    super("assetDiscovery", DEFAULT_STATE)
  }

  reset() {
    // replace, not set: wipes any key not part of the current state shape
    return this.replace(DEFAULT_STATE)
  }
}

export const assetDiscoveryStore = new AssetDiscoveryStore()
