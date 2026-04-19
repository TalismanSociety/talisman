import type { NetworkId } from "@talismn/chaindata-provider"

import { StorageProvider } from "../../libs/Store"

/**
 * Per-network bookkeeping for the Substrate asset-discovery (liveness) probe.
 *
 * Maps each probed network to the timestamp (ms since epoch) of its last
 * successful or failed probe. A missing entry means "never probed" or
 * "interrupted — must retry".
 *
 * Entries are **deleted before** a probe starts and **written after** it
 * completes, so a process kill mid-probe leaves no stale entry and the
 * network will be retried on next startup.
 */
export type SubstrateAssetDiscoveryState = Record<NetworkId, number>

class SubstrateAssetDiscoveryStore extends StorageProvider<SubstrateAssetDiscoveryState> {
  constructor() {
    super("substrateAssetDiscovery", {})
  }
}

export const substrateAssetDiscoveryStore = new SubstrateAssetDiscoveryStore()
