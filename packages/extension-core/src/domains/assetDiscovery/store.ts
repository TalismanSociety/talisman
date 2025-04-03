import { Address } from "@talismn/balances"
import { ChainId, EvmNetworkId, TokenId } from "@talismn/chaindata-provider"
import { log } from "extension-shared"

import { StorageProvider } from "../../libs/Store"
import { EvmAddress } from "../ethereum/types"
import { AssetDiscoveryScanScope } from "./types"

export type AssetDiscoveryScanType = "manual" // | "automatic"

export type AssetDiscoveryScanState = {
  currentScanScope: AssetDiscoveryScanScope | null // a non-null value means that a scan is currently running
  currentScanProgressPercent: number
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
  lastScanNetworks: string[]
  lastScanTokensCount: number
  queue?: AssetDiscoveryScanScope[]
  invalidErc20s?: string[]
}

export const DEFAULT_STATE: AssetDiscoveryScanState = {
  currentScanScope: null,
  currentScanProgressPercent: 0,
  currentScanTokensCount: 0,
  currentScanCursors: {},
  lastScanTimestamp: 0,
  lastScanAccounts: [],
  lastScanNetworks: [],
  lastScanTokensCount: 0,
  queue: [],
  invalidErc20s: [],
}

class AssetDiscoveryStore extends StorageProvider<AssetDiscoveryScanState> {
  constructor() {
    super("assetDiscovery", DEFAULT_STATE)
  }

  reset() {
    return this.set(DEFAULT_STATE)
  }

  async isInvalidErc20(evmNetworkId: EvmNetworkId, contractAddress: EvmAddress) {
    const key = `${evmNetworkId}::${contractAddress.toLowerCase()}`
    const invalidErc20s = (await this.get("invalidErc20s")) ?? []
    return invalidErc20s.includes(key)
  }

  async setInvalidErc20(evmNetworkId: EvmNetworkId, contractAddress: EvmAddress) {
    log.debug("[AssetDiscovery] setting invalid erc20", evmNetworkId, contractAddress)
    const key = `${evmNetworkId}::${contractAddress.toLowerCase()}`
    return this.mutate((state) => {
      const oldInvalidErc20s = state.invalidErc20s ?? []
      const invalidErc20s = [...new Set([...oldInvalidErc20s, key])]
      return { ...state, invalidErc20s }
    })
  }
}

export const assetDiscoveryStore = new AssetDiscoveryStore()
